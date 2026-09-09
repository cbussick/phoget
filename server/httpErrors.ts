import { z } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}
export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError(
      400,
      result.error.issues[0]?.message ?? "Ungültige Anfrage.",
      typeof result.error.issues[0]?.path[0] === "string"
        ? result.error.issues[0].path[0]
        : undefined,
    );
  return result.data;
}
