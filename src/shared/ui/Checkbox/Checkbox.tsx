import type { InputHTMLAttributes } from "react";
import "./Checkbox.css";
import "../choiceControl.css";
export function Checkbox({
  label,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  return (
    <label className="checkbox-label">
      <span className="visually-hidden">{label}</span>
      <input
        {...props}
        type="checkbox"
        className={["choice-control", className].filter(Boolean).join(" ")}
      />
    </label>
  );
}
