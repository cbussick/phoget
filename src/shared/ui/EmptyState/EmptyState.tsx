import type { ComponentProps } from "react";
import { Icon } from "../Icon/Icon";
import "./EmptyState.css";

export function EmptyState({
  title,
  description,
  icon = "emptyList",
}: {
  title: string;
  description: string;
  icon?: ComponentProps<typeof Icon>["name"];
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-mark" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
