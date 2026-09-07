import { useId } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
type Props = { label: string; multiline?: boolean } & InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement>;
export function Field({ label, multiline, ...props }: Props) {
  const id = useId();
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea id={id} rows={3} {...props} />
      ) : (
        <input id={id} type="text" {...props} />
      )}
    </div>
  );
}
