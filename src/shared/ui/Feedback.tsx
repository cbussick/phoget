import { z } from "zod";
export function Feedback({ error }: { error: Error | null }) {
  if (!error) return null;
  const message = error instanceof z.ZodError ? error.issues[0]?.message : error.message;
  return (
    <p className="error-message" role="alert">
      {message || "Please try again."}
    </p>
  );
}
