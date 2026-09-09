import type { SVGProps } from "react";

const paths = {
  shop: ["M7 13h18l-2 13H9L7 13Z", "M11 14V9a5 5 0 0 1 10 0v5", "M12 19h8M12 22h5"],
  brand: ["M5 17h22c-1 6-5 10-11 10S6 23 5 17Z", "M12 10l4 4L25 5", "M9 6c-3 3 2 4 0 7"],
  home: ["m6 15 10-9 10 9v11H6V15Z", "M12 26v-8h8v8", "M22 9V6h3v6"],
  travel: ["M8 11h16v15H8V11Z", "M12 11V8h8v3M8 17h16", "M14 21h4"],
  tools: ["M8 24 22 10l3 3-14 14H8v-3Z", "m19 13 3 3M7 7l6 6", "M8 12 5 9l4-4 3 3"],
  heart: ["M16 26s-9-5.2-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.8-9 12-9 12Z"],
  lists: ["M4 6h16M4 12h16M4 18h10"],
  settings: [
    "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 8.95 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.58 15 1.7 1.7 0 0 0 3 14H3v-4h.09A1.7 1.7 0 0 0 4.6 8.95a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.58 1.7 1.7 0 0 0 10 3h4v.09A1.7 1.7 0 0 0 15.05 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.42 9 1.7 1.7 0 0 0 21 10v4h-.09A1.7 1.7 0 0 0 19.4 15Z",
  ],
  mobileSettings: [
    "M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1",
  ],
  plus: ["M12 5v14M5 12h14"],
  back: ["m15 18-6-6 6-6"],
  arrow: ["m9 6 6 6-6 6"],
  more: [],
};
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  const large = ["shop", "brand", "home", "travel", "tools", "heart"].includes(name);
  return (
    <svg aria-hidden="true" viewBox={large ? "0 0 32 32" : "0 0 24 24"} {...props}>
      {paths[name].map((path) => (
        <path key={path} d={path} />
      ))}
      {name === "settings" || name === "mobileSettings" ? <circle cx="12" cy="12" r="3" /> : null}
      {name === "more"
        ? [5, 12, 19].map((cx) => <circle key={cx} cx={cx} cy="12" r="1.5" />)
        : null}
    </svg>
  );
}
