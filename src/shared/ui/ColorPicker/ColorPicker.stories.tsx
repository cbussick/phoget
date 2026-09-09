import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DEFAULT_LIST_COLOR } from "../../../../shared/colors";
import { controlPreview } from "../../../../.storybook/controlPreview";
import { ColorPicker, type ColorPickerProps } from "./ColorPicker";

function Example(args: ColorPickerProps) {
  const [value, setValue] = useState(args.value);
  return <ColorPicker {...args} value={value} onValueChange={setValue} />;
}

const meta = {
  title: "Components/ColorPicker",
  component: ColorPicker,
  decorators: [controlPreview],
  args: { value: DEFAULT_LIST_COLOR, onValueChange: () => {} },
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof ColorPicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Custom: Story = { args: { value: "#243566" } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = {
  args: { value: "#xyz", error: "Gib einen Hex-Farbcode mit 6 Stellen ein, zum Beispiel #8bcdf1." },
};
