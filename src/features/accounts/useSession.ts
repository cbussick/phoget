import { useQuery } from "@tanstack/react-query";
import { sessionSchema } from "../../../shared/accounts";
import { request } from "../../shared/api/request";
export const sessionKey = ["session"] as const;
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: ({ signal }) => request("/session", sessionSchema, { signal }),
    retry: false,
    refetchInterval: 5000,
  });
}
