import type { Meta, StoryObj } from "@storybook/react-vite";
import { ListRow } from "./ListRow";
import { controlPreview } from "../../../../.storybook/controlPreview";
const meta = {
  title: "Components/ListRow",
  component: ListRow,
  decorators: [controlPreview],
  args: {
    name: "Groceries",
    description: "For the fridge, pantry, and everything in between.",
    icon: "shop",
    href: "#groceries",
  },
  argTypes: {
    linkComponent: { control: false },
    icon: { control: "select", options: ["shop", "home", "travel", "tools", "heart"] },
  },
} satisfies Meta<typeof ListRow>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const CustomColor: StoryObj<typeof meta> = { args: { color: "#93c9a4" } };
