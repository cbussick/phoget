import { useMutation, useQueryClient } from "@tanstack/react-query";
import { householdKey } from "./queryKeys";

export function useAction<T>(action: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: action,
    retry: false,
    networkMode: "always",
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: householdKey });
    },
  });
}
