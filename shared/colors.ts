import { z } from "zod";

export const DEFAULT_LIST_COLOR = "#8bcdf1";

// Only opaque sRGB hex values cross the API/CSS boundary (no CSS functions or alpha).
export const hexColorSchema = z
  .string()
  .length(7, "Gib einen Hex-Farbcode mit 6 Stellen ein, zum Beispiel #8bcdf1.")
  .regex(/^#[0-9a-f]{6}$/i, "Gib einen Hex-Farbcode mit 6 Stellen ein, zum Beispiel #8bcdf1.")
  .transform((value) => value.toLowerCase());
