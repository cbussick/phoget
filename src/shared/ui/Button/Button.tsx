import type { ButtonHTMLAttributes, Ref } from "react";
import { Spinner } from "../Spinner/Spinner";
import { accentColorStyle } from "../accentColor";
import "./Button.css";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "default" | "large" | "compact" | "add" | "icon" | "content";
  loading?: boolean;
  loadingLabel?: string;
  accentColor?: string;
};
export function Button({
  type = "button",
  variant = "primary",
  size = "default",
  className,
  loading = false,
  loadingLabel = "Wird gespeichert…",
  disabled,
  accentColor,
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        ...(accentColor && variant === "primary" ? accentColorStyle(accentColor) : {}),
        ...style,
      }}
      type={type}
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={["gather-button", className].filter(Boolean).join(" ")}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
