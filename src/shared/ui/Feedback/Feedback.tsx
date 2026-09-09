import { z } from "zod";
import { Callout } from "../Callout/Callout";
export function Feedback({ error }: { error: Error | null }) {
  if (!error) return null;
  const message = error instanceof z.ZodError ? error.issues[0]?.message : error.message;
  return <Callout className="error-message">{message || "Bitte versuche es erneut."}</Callout>;
}
