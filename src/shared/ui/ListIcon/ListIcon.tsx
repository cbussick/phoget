import type { ComponentProps } from "react";
import { Icon } from "../Icon/Icon";
import { DEFAULT_LIST_COLOR } from "../../../../shared/colors";
import { accentColorStyle } from "../accentColor";
import "./ListIcon.css";
export function ListIcon({
  name,
  color = DEFAULT_LIST_COLOR,
}: Pick<ComponentProps<typeof Icon>, "name"> & { color?: string }) {
  return (
    <span
      className="list-icon"
      aria-hidden="true"
      style={color === DEFAULT_LIST_COLOR ? undefined : accentColorStyle(color)}
    >
      <Icon name={name} />
    </span>
  );
}
