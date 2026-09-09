import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "../Button/Button";
import { FieldLayout, type FieldPresentation } from "../FieldLayout/FieldLayout";
import { Icon } from "../Icon/Icon";
import { useAnchoredPopup } from "../OptionList/useAnchoredPopup";
import { OptionList } from "../OptionList/OptionList";
import "./Select.css";

export type SelectOption = { value: string; label: string; disabled?: boolean };
export type SelectProps = FieldPresentation & {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
};
const typeaheadTimeout = 500;

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  disabled,
  ...field
}: SelectProps) {
  const generatedId = useId();
  const id = field.id ?? generatedId;
  const popupId = id + "-options";
  const [localValue, setLocalValue] = useState(
    defaultValue ?? options.find((option) => !option.disabled)?.value ?? "",
  );
  const selectedValue = value ?? localValue;
  const selected = options.find((option) => option.value === selectedValue);
  const enabled = options.filter((option) => !option.disabled);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>();
  const expanded = open && !disabled;
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ query: "", time: 0 });
  const optionId = (optionValue: string) => popupId + "-" + encodeURIComponent(optionValue);
  useAnchoredPopup(expanded, trigger, popup);

  function commit(next: string) {
    if (value === undefined) setLocalValue(next);
    onValueChange?.(next);
  }
  function show(
    next = enabled.find((option) => option.value === selectedValue)?.value ?? enabled[0]?.value,
  ) {
    setActive(next);
    setOpen(true);
  }
  function choose(next: string) {
    commit(next);
    setOpen(false);
    trigger.current?.focus();
  }
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.ctrlKey || event.metaKey) return;
    const current = enabled.findIndex((option) => option.value === active);
    const typingSpace = event.key === " " && Date.now() - typeahead.current.time < typeaheadTimeout;
    if (event.key.length === 1 && !event.altKey && (event.key !== " " || typingSpace)) {
      event.preventDefault();
      const now = Date.now();
      const previous = typeahead.current;
      const query =
        (now - previous.time > typeaheadTimeout ? "" : previous.query) + event.key.toLowerCase();
      typeahead.current = { query, time: now };
      const repeated = Array.from(query).every((letter) => letter === query[0]);
      const search = repeated ? query[0] : query;
      const start = repeated ? Math.max(0, current + 1) : 0;
      const ordered = [...enabled.slice(start), ...enabled.slice(0, start)];
      const match = ordered.find((option) => option.label.toLowerCase().startsWith(search));
      if (match) show(match.value);
      return;
    }
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!expanded) show();
        else
          setActive(
            enabled[
              Math.max(
                0,
                Math.min(enabled.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)),
              )
            ]?.value,
          );
        break;
      }
      case "Home":
      case "End":
        event.preventDefault();
        show(event.key === "Home" ? enabled[0]?.value : enabled.at(-1)?.value);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!expanded) show();
        else if (active) choose(active);
        break;
      case "Escape":
        if (expanded) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
        break;
      case "Tab":
        if (expanded && active) commit(active);
        setOpen(false);
        break;
    }
  }

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!expanded) return;
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !trigger.current?.contains(event.target) &&
        !popup.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [expanded]);

  useEffect(() => {
    if (expanded && active)
      document
        .getElementById(popupId + "-" + encodeURIComponent(active))
        ?.scrollIntoView({ block: "nearest" });
  }, [active, expanded, popupId]);

  useEffect(() => {
    const form = trigger.current?.form;
    const reset = () => {
      setLocalValue(defaultValue ?? options.find((option) => !option.disabled)?.value ?? "");
      setOpen(false);
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [defaultValue, options]);

  return (
    <FieldLayout {...field} id={id}>
      {(attributes) => (
        <>
          <Button
            {...attributes}
            ref={trigger}
            variant="secondary"
            className="select-trigger field-control"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={Boolean(expanded)}
            aria-controls={expanded ? popupId : undefined}
            aria-activedescendant={expanded && active ? optionId(active) : undefined}
            aria-labelledby={id + "-label"}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            onBlur={() => setOpen(false)}
            onClick={() => (expanded ? setOpen(false) : show())}
          >
            <span className="select-value">{selected?.label ?? "Option auswählen"}</span>
            <Icon name="chevronDown" className="select-chevron" />
          </Button>
          {name ? (
            <input type="hidden" name={name} value={selectedValue} disabled={disabled} />
          ) : null}
          {expanded ? (
            <OptionList
              ref={popup}
              id={popupId}
              labelledBy={id + "-label"}
              options={options}
              selected={selectedValue}
              active={active}
              onActive={setActive}
              onChoose={choose}
            />
          ) : null}
        </>
      )}
    </FieldLayout>
  );
}
