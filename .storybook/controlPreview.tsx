import type { Decorator } from "@storybook/react-vite";

export const controlPreview: Decorator = (Story) => (
  <div className="story-control">
    <Story />
  </div>
);
