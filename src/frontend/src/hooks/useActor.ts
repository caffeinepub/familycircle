import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";
export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!identity) {
        return await createActorWithConfig();
      }

      const actor = await createActorWithConfig({
        agentOptions: { identity },
      });

      // _initializeAccessControlWithSecret is admin-only and must never be
      // called for regular users. Security is enforced by the caller's
      // Principal (set by Internet Identity), not by this function.

      return actor;
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
    retry: 2,
  });

  // When the actor changes, invalidate dependent queries
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
      queryClient.refetchQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, queryClient]);

  // On hard error, trigger a full page reload so the session can be
  // re-established cleanly (acceptable per product decision).
  useEffect(() => {
    if (actorQuery.isError && identity) {
      window.location.reload();
    }
  }, [actorQuery.isError, identity]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
    error: actorQuery.error,
  };
}
