import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "./Avatar";
const meta = {
  title: "Components/Avatar",
  component: Avatar,
  args: { name: "Morgan" },
} satisfies Meta<typeof Avatar>;
export default meta;
export const Warm: StoryObj<typeof meta> = {};
export const Cool: StoryObj<typeof meta> = { args: { name: "Jamie", tone: "cool" } };
export const Household: StoryObj<typeof meta> = {
  render: () => (
    <div className="story-row">
      <Avatar name="Morgan" />
      <Avatar name="Jamie" tone="cool" />
      <Avatar name="Élodie" />
    </div>
  ),
};
