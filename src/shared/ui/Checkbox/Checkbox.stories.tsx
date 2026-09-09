import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./Checkbox";
const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  args: { label: "Mark item done" },
} satisfies Meta<typeof Checkbox>;
export default meta;
export const Unchecked: StoryObj<typeof meta> = {};
export const Checked: StoryObj<typeof meta> = { args: { defaultChecked: true } };
export const Disabled: StoryObj<typeof meta> = { args: { disabled: true } };
