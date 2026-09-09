import { useEffect, useId, useRef, useState, type Ref } from "react";
import { TextField } from "../TextField/TextField";
import type { FieldPresentation } from "../FieldLayout/FieldLayout";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { OptionList } from "../OptionList/OptionList";
import { useAnchoredPopup } from "../OptionList/useAnchoredPopup";
import "./ComboBox.css";

export function ComboBox({
  value,
  options,
  onValueChange,
  onBlur,
  inputRef,
  disabled,
  required,
  name,
  placeholder,
  ...field
}: FieldPresentation & {
  value: string;
  options: readonly string[];
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  placeholder?: string;
}) {
  const generatedId = useId();
  const id = field.id ?? generatedId;
  const popupId = id + "-options";
  const input = useRef<HTMLInputElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>();
  const matches = options.filter((option) =>
    option.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()),
  );
  const expanded = open && !disabled && matches.length > 0;
  const highlighted = active && matches.includes(active) ? active : undefined;
  useAnchoredPopup(expanded, anchor, popup);
  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setActive(undefined);
    }
  }, [disabled]);
  useEffect(() => {
    if (highlighted && expanded)
      document
        .getElementById(popupId + "-" + encodeURIComponent(highlighted))
        ?.scrollIntoView({ block: "nearest" });
  }, [highlighted, expanded, popupId]);
  function choose(next: string) {
    onValueChange(next);
    setOpen(false);
    setActive(undefined);
    input.current?.focus();
  }
  return (
    <div className="combo-box">
      <TextField
        {...field}
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete="off"
        inputRef={(element) => {
          input.current = element;
          anchor.current = element?.parentElement ?? null;
          if (typeof inputRef === "function") inputRef(element);
          else if (inputRef) inputRef.current = element;
        }}
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={expanded ? popupId : undefined}
        aria-activedescendant={
          expanded && highlighted ? popupId + "-" + encodeURIComponent(highlighted) : undefined
        }
        onChange={(event) => {
          onValueChange(event.target.value);
          setActive(undefined);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) {
            if (event.key === "Enter") event.preventDefault();
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const index = matches.indexOf(highlighted ?? "");
            const next =
              !expanded || index < 0
                ? event.key === "ArrowDown"
                  ? 0
                  : matches.length - 1
                : (index + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
            setOpen(true);
            setActive(matches[next]);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            setActive(undefined);
          } else if (event.key === "Enter" && expanded && highlighted) {
            event.preventDefault();
            choose(highlighted);
          }
        }}
        endAdornment={
          <Button
            variant="ghost"
            size="icon"
            className="combo-toggle"
            aria-label={"Vorschläge anzeigen: " + field.label}
            disabled={disabled}
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              input.current?.focus();
              setOpen(!expanded);
              setActive(undefined);
            }}
          >
            <Icon
              name="chevronDown"
              className={expanded ? "combo-chevron expanded" : "combo-chevron"}
            />
          </Button>
        }
      />
      {expanded ? (
        <OptionList
          ref={popup}
          id={popupId}
          labelledBy={id + "-label"}
          options={matches.map((option) => ({ value: option, label: option }))}
          selected={value}
          active={highlighted}
          onActive={setActive}
          onChoose={choose}
        />
      ) : null}
    </div>
  );
}
