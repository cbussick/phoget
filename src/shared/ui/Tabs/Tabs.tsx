import {
  Tab as AriaTab,
  TabList as AriaTabList,
  type TabProps,
  type TabListProps,
} from "react-aria-components";
import "./Tabs.css";

export { Tabs, TabPanel } from "react-aria-components";

export function TabList({
  className,
  ...props
}: Omit<TabListProps<object>, "className"> & { className?: string }) {
  return (
    <AriaTabList
      {...props}
      className={["segmented-tab-list", className].filter(Boolean).join(" ")}
    />
  );
}

export function Tab(props: Omit<TabProps, "className">) {
  return <AriaTab {...props} className="segmented-tab" />;
}
