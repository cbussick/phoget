import type { QueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import type { sessionSchema } from "../../../shared/accounts";
import { sessionKey } from "./useSession";

// Keep the observed session query attached while clearing the previous account's data.
export async function replaceSession(client: QueryClient, session: z.infer<typeof sessionSchema>) {
  await client.cancelQueries();
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionKey[0] });
  client.getMutationCache().clear();
  client.setQueryData(sessionKey, session);
}
