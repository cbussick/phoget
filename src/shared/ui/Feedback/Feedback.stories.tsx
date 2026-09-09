import type { Meta, StoryObj } from "@storybook/react-vite";
import { Feedback } from "./Feedback";
const meta = {
  title: "Components/Feedback",
  component: Feedback,
  args: { error: new Error("Cannot save your changes. Please try again.") },
  argTypes: { error: { control: false } },
} satisfies Meta<typeof Feedback>;
export default meta;
export const SaveFailed: StoryObj<typeof meta> = {};
