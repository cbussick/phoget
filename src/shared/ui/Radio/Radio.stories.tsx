import type { Meta, StoryObj } from "@storybook/react-vite";
import { Radio } from "./Radio";
const meta = {
  title: "Components/Radio",
  component: Radio,
  args: { label: "Shopping", name: "list-icon", value: "shop" },
} satisfies Meta<typeof Radio>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Checked: StoryObj<typeof meta> = { args: { defaultChecked: true } };
export const Disabled: StoryObj<typeof meta> = { args: { disabled: true } };
