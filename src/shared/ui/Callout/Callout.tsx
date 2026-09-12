import type { ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import "./Callout.css";

export function Callout({
  children,
  className = "",
  announce = true,
}: {
  children: ReactNode;
  className?: string;
  announce?: boolean;
}) {
  return (
    <div
      className={["callout", className].filter(Boolean).join(" ")}
      role={announce ? "alert" : undefined}
      aria-atomic={announce ? "true" : undefined}
    >
      <Icon name="error" />
      <div className="callout-message">{children}</div>
    </div>
  );
}
