import type { Preview } from "@storybook/react-vite";
import "@fontsource-variable/nunito";
import "../src/app/tokens.css";
import "../src/app/baseline.css";
import "../src/shared/ui/controls.css";
import "../src/app/extensions.css";
import "./preview.css";
const preview: Preview = {
  parameters: { a11y: { test: "error" }, controls: { expanded: true }, layout: "centered" },
};
export default preview;
