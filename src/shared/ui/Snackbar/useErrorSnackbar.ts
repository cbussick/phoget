import { useEffect } from "react";
import { ZodError } from "zod";
import { useSnackbar } from "./Snackbar";

export function useErrorSnackbar(error: Error | string | null) {
  const notify = useSnackbar();

  useEffect(() => {
    if (!error) {
      return;
    }
    const message =
      typeof error === "string"
        ? error
        : error instanceof ZodError
          ? error.issues[0]?.message
          : error.message;
    notify(message || "Bitte versuche es erneut.", "error");
  }, [error, notify]);
}
