import type { Meta, StoryObj } from "@storybook/react-vite";
import { iconSchema } from "../../../../shared/contracts";
import { ListIcon } from "./ListIcon";
const meta = {
  title: "Components/ListIcon",
  component: ListIcon,
  args: { name: "shop" },
  argTypes: { name: { control: "select", options: iconSchema.options } },
} satisfies Meta<typeof ListIcon>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const AllIcons: StoryObj<typeof meta> = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
      {iconSchema.options.map((name) => (
        <ListIcon key={name} name={name} />
      ))}
    </div>
  ),
};
export const CustomColor: StoryObj<typeof meta> = { args: { color: "#243566", name: "travel" } };
