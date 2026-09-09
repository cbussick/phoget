import type { ReactNode } from "react";
import "./Badge.css";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent";
}) {
  return (
    <span className="gather-badge" data-tone={tone}>
      {children}
    </span>
  );
}
