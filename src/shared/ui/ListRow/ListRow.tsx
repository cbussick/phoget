import { useId, type AnchorHTMLAttributes, type ComponentProps, type ComponentType } from "react";
import { Icon } from "../Icon/Icon";
import { ListIcon } from "../ListIcon/ListIcon";
import "./ListRow.css";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
type ListRowProps = Omit<LinkProps, "children" | "title"> & {
  name: string;
  description?: string;
  activity?: string;
  icon: ComponentProps<typeof ListIcon>["name"];
  color?: string;
  linkComponent?: ComponentType<LinkProps>;
};

export function ListRow({
  name,
  description,
  activity,
  icon,
  color,
  linkComponent,
  className = "",
  ...props
}: ListRowProps) {
  const Root = linkComponent ?? "a";
  const id = useId();
  return (
    <Root
      aria-labelledby={id}
      aria-describedby={activity ? id + "-activity" : undefined}
      {...props}
      className={["list-row", className].filter(Boolean).join(" ")}
    >
      <ListIcon name={icon} color={color} />
      <span className="list-copy">
        <strong id={id}>{name}</strong>
        {activity ? (
          <span className="list-activity" id={id + "-activity"}>
            {activity}
          </span>
        ) : null}
        {description ? <span>{description}</span> : null}
      </span>
      <Icon className="list-arrow" name="arrow" />
    </Root>
  );
}
