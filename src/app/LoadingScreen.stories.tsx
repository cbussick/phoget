import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingScreen } from "./LoadingScreen";

const meta = {
  title: "App/Loading screen",
  component: LoadingScreen,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LoadingScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Startup: Story = {};
export const Lists: Story = { args: { message: "Deine Listen werden geladen…" } };
