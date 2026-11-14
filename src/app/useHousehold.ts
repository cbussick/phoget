import { householdPollMs } from "./pollingIntervals";
import { useQuery } from "@tanstack/react-query";
import { request } from "../shared/api/request";
import { stateSchema } from "../../shared/contracts";
import { householdKey } from "../shared/api/queryKeys";
export function useHousehold() {
  return useQuery({
    // Startup must settle offline rather than pausing behind the loading screen.
    networkMode: "always",
    queryKey: householdKey,
    queryFn: ({ signal }) => request("/state", stateSchema, { signal }),
    refetchInterval: householdPollMs,
    retry: 1,
  });
}
