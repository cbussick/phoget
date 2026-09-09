import type { ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import "./Callout.css";

export function Callout({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={["callout", className].filter(Boolean).join(" ")}
      role="alert"
      aria-atomic="true"
    >
      <Icon name="error" />
      <div className="callout-message">{children}</div>
    </div>
  );
}
