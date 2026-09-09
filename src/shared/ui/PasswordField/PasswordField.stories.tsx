import type { Meta, StoryObj } from "@storybook/react-vite";
import { PasswordField } from "./PasswordField";
import { controlPreview } from "../../../../.storybook/controlPreview";
const meta = {
  decorators: [controlPreview],
  title: "Components/PasswordField",
  component: PasswordField,
  args: {
    label: "Password",
    autoComplete: "current-password",
    defaultValue: "a long sample password",
  },
} satisfies Meta<typeof PasswordField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const NewPassword: Story = {
  args: {
    autoComplete: "new-password",
    label: "New password",
    hint: "Use at least 15 characters.",
  },
};
export const Invalid: Story = { args: { error: "The current password is incorrect." } };
export const Disabled: Story = { args: { disabled: true } };
