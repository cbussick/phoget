import { sessionPollMs } from "../../app/pollingIntervals";
import { useQuery } from "@tanstack/react-query";
import { sessionSchema } from "../../../shared/accounts";
import { request } from "../../shared/api/request";
export const sessionKey = ["session"] as const;
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: ({ signal }) => request("/session", sessionSchema, { signal }),
    retry: false,
    // A logged-out page has nothing to keep in sync. Login updates this query directly.
    refetchInterval: (query) => (query.state.data?.user ? sessionPollMs : false),
  });
}
