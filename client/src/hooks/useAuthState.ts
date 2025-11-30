import { useMemo } from "react";

import type { ViewerState } from "@shared/types/auth";
import { trpc } from "../lib/trpc";

export function useAuthState() {
  const query = trpc.auth.viewer.useQuery(undefined, { retry: 0 });

  const viewer: ViewerState | undefined = useMemo(() => query.data, [query.data]);

  return { ...query, viewer };
}
