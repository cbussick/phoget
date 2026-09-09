import { useId, type AriaAttributes, type ReactNode } from "react";
import "./FieldLayout.css";

export type FieldPresentation = {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
};

type ControlAttributes = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": AriaAttributes["aria-invalid"];
};

export function FieldLayout({
  label,
  hint,
  error,
  id,
  children,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: FieldPresentation & { children: (attributes: ControlAttributes) => ReactNode }) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const description =
    [describedBy, hint && !error && controlId + "-hint", error && controlId + "-error"]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="form-field">
      <label htmlFor={controlId} id={controlId + "-label"}>
        {label}
      </label>
      {children({
        id: controlId,
        "aria-describedby": description,
        "aria-invalid": Boolean(error) || invalid,
      })}
      <div
        className="field-error-space"
        data-error={Boolean(error)}
        aria-live="polite"
        aria-atomic="true"
      >
        {hint ? (
          <p className="field-hint" id={controlId + "-hint"}>
            {hint}
          </p>
        ) : null}
        {error ? (
          <p className="field-hint field-error" id={controlId + "-error"}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
