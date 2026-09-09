import type { InputHTMLAttributes } from "react";
import "../choiceControl.css";

export function Radio({
  label,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  return (
    <input
      {...props}
      type="radio"
      aria-label={label}
      className={["choice-control", className].filter(Boolean).join(" ")}
    />
  );
}
