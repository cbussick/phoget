import "./Avatar.css";
export function Avatar({ name, tone = "warm" }: { name: string; tone?: "warm" | "cool" }) {
  return (
    <span role="img" className="avatar" data-tone={tone} title={name} aria-label={name}>
      <span className="avatar-letter">{Array.from(name.trim())[0]?.toUpperCase() ?? "?"}</span>
    </span>
  );
}
