import { useId, useRef, type ReactNode } from "react";
import "./ToggleButtonGroup.css";

type Option = { value: string; label: string; icon: ReactNode; disabled?: boolean };
export function ToggleButtonGroup({
  label,
  value,
  options,
  onValueChange,
  onBlur,
  disabled = false,
  error,
}: {
  label: string;
  value: string;
  options: Option[];
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const tabStop =
    options.find((option) => option.value === value && !option.disabled) ??
    options.find((option) => !option.disabled);
  return (
    <div className="form-field toggle-field">
      <span id={id + "-label"} className="toggle-label">
        {label}
      </span>
      <div
        ref={root}
        className="toggle-group"
        role="group"
        aria-labelledby={id + "-label"}
        aria-describedby={error ? id + "-error" : undefined}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.();
        }}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const buttons = [...root.current!.querySelectorAll<HTMLButtonElement>("button:enabled")];
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
          buttons.forEach((button, position) => {
            button.tabIndex = position === next ? 0 : -1;
          });
          buttons[next]?.focus();
        }}
      >
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            className="toggle-button"
            aria-label={option.label}
            aria-pressed={value === option.value}
            disabled={disabled || option.disabled}
            tabIndex={tabStop?.value === option.value ? 0 : -1}
            onClick={() => onValueChange(option.value)}
          >
            {option.icon}
          </button>
        ))}
      </div>
      <div className="field-error-space" aria-live="polite">
        {error ? (
          <p id={id + "-error"} className="field-hint field-error">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
