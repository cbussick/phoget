import type { Meta, StoryObj } from "@storybook/react-vite";
import { Callout } from "./Callout";
import { controlPreview } from "../../../../.storybook/controlPreview";
const meta = {
  title: "Components/Callout",
  component: Callout,
  decorators: [controlPreview],
  args: { children: "Incorrect username or password." },
} satisfies Meta<typeof Callout>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
