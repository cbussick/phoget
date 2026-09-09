import { z } from "zod";
import { errorSchema } from "../../../shared/contracts";

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: options.signal ?? AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const parsed = errorSchema.safeParse(await response.json().catch(() => null));
    throw new Error(parsed.success ? parsed.data.error : "Cannot reach Phoget. Please try again.");
  }
  if (response.status === 204) return schema.parse(undefined);
  return schema.parse(await response.json());
}
