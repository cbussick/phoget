import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextField } from "./TextField";
import { controlPreview } from "../../../../.storybook/controlPreview";
const meta = {
  decorators: [controlPreview],
  title: "Components/TextField",
  component: TextField,
  args: { label: "Your name", placeholder: "e.g. Jamie" },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithHint: Story = { args: { hint: "This name appears in your household." } };
export const Invalid: Story = { args: { error: "Enter a name." } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "Jamie" } };
export const Multiline: Story = {
  args: { multiline: true, label: "Note", placeholder: "Add a useful detail…" },
};
