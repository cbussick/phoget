import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState } from "./EmptyState";
const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  args: {
    title: "Nothing here yet",
    description: "Add your first item above. We'll keep track together.",
  },
} satisfies Meta<typeof EmptyState>;
export default meta;
export const EmptyList: StoryObj<typeof meta> = {};
export const AllDone: StoryObj<typeof meta> = {
  args: {
    title: "All done!",
    description: "Everything on this list is done. Enjoy the little breather.",
    icon: "complete",
  },
};
