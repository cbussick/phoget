import { z } from "zod";
import { errorSchema } from "../../../shared/contracts";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Gather-Request": "1", ...options.headers },
    signal: options.signal ?? AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const parsed = errorSchema.safeParse(await response.json().catch(() => null));
    throw new ApiError(
      response.status,
      parsed.success
        ? parsed.data.error
        : "Don't Phoget ist nicht erreichbar. Bitte versuche es erneut.",
      parsed.success ? parsed.data.field : undefined,
    );
  }
  if (response.status === 204) return schema.parse(undefined);
  return schema.parse(await response.json());
}
