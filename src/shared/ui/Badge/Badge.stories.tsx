import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge";
const meta = {
  title: "Components/Badge",
  component: Badge,
  args: { children: "User" },
} satisfies Meta<typeof Badge>;
export default meta;
export const User: StoryObj<typeof meta> = {};
export const Admin: StoryObj<typeof meta> = { args: { children: "Admin", tone: "accent" } };
