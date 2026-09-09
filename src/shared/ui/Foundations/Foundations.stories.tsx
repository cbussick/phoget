import type { Meta, StoryObj } from "@storybook/react-vite";
const meta = {
  title: "Foundations/Design tokens",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
export const Colors: StoryObj = {
  render: () => (
    <div className="story-foundations">
      {["canvas", "surface", "ink", "ink-soft", "line", "accent", "accent-control", "error"].map(
        (name) => (
          <div key={name}>
            <div
              className="story-swatch"
              style={{ background: `var(--color-${name})` }}
              aria-hidden="true"
            >
              &nbsp;
            </div>
            <p>--color-{name}</p>
          </div>
        ),
      )}
    </div>
  ),
};
export const Typography: StoryObj = {
  render: () => (
    <div className="story-stack">
      <h1>Gather together</h1>
      <h2>Our shared household</h2>
      <p>A little space for the things we need to remember.</p>
      <small>Nunito, self-hosted. All type and spacing comes from tokens.</small>
    </div>
  ),
};
export const Spacing: StoryObj = {
  render: () => (
    <div className="story-stack">
      {[1, 2, 3, 4, 6, 8, 12].map((size) => (
        <div key={size}>
          --space-{size}
          <div style={{ height: `var(--space-${size})`, background: "var(--color-accent)" }} />
        </div>
      ))}
    </div>
  ),
};
