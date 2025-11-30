import { useMemo } from "react";

import type { ViewerState } from "@shared/types/auth";
import { trpc } from "../lib/trpc";

export type AuthErrorReason = "strict" | "unauthorized" | "network" | null;

export function useAuthState() {
  const query = trpc.auth.viewer.useQuery(undefined, { retry: 0 });

  const viewer: ViewerState | undefined = useMemo(() => query.data, [query.data]);
  const errorReason: AuthErrorReason = useMemo(() => {
    if (!query.error) return null;
    const reason = query.error.data?.reason;
    if (reason === "manus-auth-strict") return "strict";
    if (query.error.data?.code === "UNAUTHORIZED") return "unauthorized";
    return "network";
  }, [query.error]);

  return { ...query, viewer, errorReason };
}
