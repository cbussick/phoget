import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select";
import { controlPreview } from "../../../../.storybook/controlPreview";
const meta = {
  decorators: [controlPreview],
  title: "Components/Select",
  component: Select,
  args: {
    label: "Role",
    options: [
      { value: "user", label: "User" },
      { value: "guest", label: "Guest (unavailable)", disabled: true },
      { value: "admin", label: "Administrator" },
    ],
  },
} satisfies Meta<typeof Select>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Disabled: StoryObj<typeof meta> = { args: { disabled: true } };
export const Invalid: StoryObj<typeof meta> = { args: { error: "Choose a role." } };
