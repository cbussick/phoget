import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComboBox } from "./ComboBox";
import { controlPreview } from "../../../../.storybook/controlPreview";
function Example(args: ComponentProps<typeof ComboBox>) {
  const [value, setValue] = useState(args.value);
  return <ComboBox {...args} value={value} onValueChange={setValue} />;
}
const meta = {
  title: "Components/ComboBox",
  component: ComboBox,
  decorators: [controlPreview],
  args: {
    label: "Item",
    value: "",
    options: ["Bananas", "Coffee", "Oat milk"],
    onValueChange: () => {},
    placeholder: "Add an item…",
  },
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof ComboBox>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Disabled: StoryObj<typeof meta> = { args: { disabled: true, value: "Coffee" } };
export const Invalid: StoryObj<typeof meta> = { args: { error: "Enter a name." } };
