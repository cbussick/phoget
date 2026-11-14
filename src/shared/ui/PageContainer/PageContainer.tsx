import type { ReactNode } from "react";
import "./PageContainer.css";

export function PageContainer({
  children,
  overview = false,
  className,
}: {
  children: ReactNode;
  overview?: boolean;
  className?: string;
}) {
  return (
    <main
      id="main-content"
      className={["main-content", overview && "page-container-overview", className]
        .filter(Boolean)
        .join(" ")}
      tabIndex={-1}
    >
      {children}
    </main>
  );
}
