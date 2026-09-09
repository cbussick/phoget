import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "./Icon";
const meta = {
  title: "Components/Icon",
  component: Icon,
  args: { name: "shop" },
  decorators: [
    (Story) => (
      <div className="story-icon">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Icon>;
export default meta;
export const Shopping: StoryObj<typeof meta> = {};
export const Home: StoryObj<typeof meta> = { args: { name: "home" } };
export const Travel: StoryObj<typeof meta> = { args: { name: "travel" } };
