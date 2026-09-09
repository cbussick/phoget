import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";
import { Icon } from "../Icon/Icon";
const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Save changes", variant: "primary" },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "ghost", "danger"] },
    size: { control: "select", options: ["default", "large", "compact", "add", "icon", "content"] },
  },
  globals: { pseudo: {} },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary", children: "Cancel" } };
export const Ghost: Story = { args: { variant: "ghost", children: "View details" } };
export const Danger: Story = { args: { variant: "danger", children: "Delete user" } };
export const Hover: Story = { globals: { pseudo: { hover: true } } };
export const Pressed: Story = { globals: { pseudo: { active: true } } };
export const KeyboardFocus: Story = { globals: { pseudo: { focusVisible: true } } };
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };
export const CustomColor: Story = { args: { accentColor: "#243566", children: "Hinzufügen" } };
export const LightColor: Story = { args: { accentColor: "#ffffff", children: "Hinzufügen" } };
export const CustomColorHover: Story = {
  args: { accentColor: "#777777", children: "Hinzufügen" },
  globals: { pseudo: { hover: true } },
};
export const CustomColorPressed: Story = {
  args: { accentColor: "#777777", children: "Hinzufügen" },
  globals: { pseudo: { active: true } },
};
export const CustomColorFocus: Story = {
  args: { accentColor: "#243566", children: "Hinzufügen" },
  globals: { pseudo: { focusVisible: true } },
};
export const IconOnly: Story = {
  args: {
    variant: "secondary",
    size: "icon",
    "aria-label": "More options",
    children: <Icon name="more" />,
  },
};
