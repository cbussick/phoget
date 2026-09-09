import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ToggleButtonGroup } from "./ToggleButtonGroup";
import { Icon } from "../Icon/Icon";
import { controlPreview } from "../../../../.storybook/controlPreview";
function Example(args: ComponentProps<typeof ToggleButtonGroup>) {
  const [value, setValue] = useState(args.value);
  return <ToggleButtonGroup {...args} value={value} onValueChange={setValue} />;
}
const meta = {
  title: "Components/ToggleButtonGroup",
  component: ToggleButtonGroup,
  decorators: [controlPreview],
  args: {
    label: "Icon",
    value: "shop",
    onValueChange: () => {},
    options: (["shop", "home", "travel", "tools", "heart"] as const).map((value) => ({
      value,
      label: value,
      icon: <Icon name={value} />,
    })),
  },
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof ToggleButtonGroup>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Disabled: StoryObj<typeof meta> = { args: { disabled: true } };
