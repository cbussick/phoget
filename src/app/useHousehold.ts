import { useQuery } from "@tanstack/react-query";
import { request } from "../shared/api/request";
import { stateSchema } from "../../shared/contracts";
import { householdKey } from "../shared/api/queryKeys";
export function useHousehold() {
  return useQuery({
    queryKey: householdKey,
    queryFn: ({ signal }) => request("/state", stateSchema, { signal }),
    refetchInterval: 10_000,
    retry: 1,
  });
}
