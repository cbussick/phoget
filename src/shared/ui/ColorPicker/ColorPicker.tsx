import { lazy, Suspense, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "../Button/Button";
import { useAnchoredPopup } from "../OptionList/useAnchoredPopup";
import { DEFAULT_LIST_COLOR, hexColorSchema } from "../../../../shared/colors";
import { Icon } from "../Icon/Icon";
import { TextField } from "../TextField/TextField";
import { ToggleButtonGroup } from "../ToggleButtonGroup/ToggleButtonGroup";
import { accentColorStyle } from "../accentColor";
import "./ColorPicker.css";

const ColorSpectrum = lazy(() => import("./ColorSpectrum"));

export const colorPresets = [
  { value: DEFAULT_LIST_COLOR, label: "Blau" },
  { value: "#93c9a4", label: "Grün" },
  { value: "#f1d477", label: "Gelb" },
  { value: "#eead78", label: "Orange" },
  { value: "#e68b8b", label: "Rot" },
  { value: "#c6ace3", label: "Violett" },
] as const;

export type ColorPickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
};

export function ColorPicker({ value, onValueChange, onBlur, disabled, error }: ColorPickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  useAnchoredPopup(open && !disabled, anchor, popup);
  useLayoutEffect(() => {
    if (open && !disabled) popup.current?.focus();
  }, [open, disabled]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const parsed = hexColorSchema.safeParse(value);
  const selected = parsed.success ? parsed.data : undefined;
  return (
    <fieldset className="color-picker" disabled={disabled}>
      <legend>Farbe</legend>
      <ToggleButtonGroup
        label="Grundfarben"
        value={selected ?? ""}
        onValueChange={onValueChange}
        onBlur={onBlur}
        disabled={disabled}
        options={colorPresets.map((preset) => ({
          ...preset,
          icon: (
            <span
              className="color-swatch"
              style={accentColorStyle(preset.value)}
              title={preset.label}
              aria-hidden="true"
            >
              {selected === preset.value ? <Icon name="check" /> : null}
            </span>
          ),
        }))}
      />
      <div ref={anchor}>
        <TextField
          id={id}
          label="Eigene Farbe (Hex)"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          error={error}
          hint="Hex-Code eingeben oder Farbfeld öffnen."
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          endAdornment={
            <Button
              ref={trigger}
              variant="ghost"
              className="color-picker-trigger"
              aria-label="Farbe auswählen"
              aria-haspopup="dialog"
              aria-expanded={open && !disabled}
              aria-controls={open && !disabled ? id + "-popup" : undefined}
              aria-describedby={id + (error ? "-error" : "-hint")}
              onClick={() => setOpen(!open)}
              onBlur={onBlur}
              disabled={disabled}
            >
              <span
                className="color-swatch"
                aria-hidden="true"
                style={accentColorStyle(selected ?? DEFAULT_LIST_COLOR)}
              />
            </Button>
          }
        />
      </div>
      {open && !disabled ? (
        <div
          ref={popup}
          id={id + "-popup"}
          popover="auto"
          role="dialog"
          tabIndex={-1}
          aria-labelledby={id + "-popup-title"}
          className="color-popover"
          onToggle={(event) => {
            if (event.newState === "closed") setOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
          }}
        >
          <h3 id={id + "-popup-title"}>Eigene Farbe</h3>
          <Suspense fallback={<p role="status">Farbauswahl wird geladen…</p>}>
            <ColorSpectrum value={selected ?? DEFAULT_LIST_COLOR} onValueChange={onValueChange} />
          </Suspense>
          <div className="color-popover-footer">
            <span>{selected ?? DEFAULT_LIST_COLOR}</span>
            <Button variant="secondary" onClick={close}>
              Fertig
            </Button>
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
