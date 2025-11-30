import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { SharedAuthUser } from "@shared/types/auth";
import type { WorkspaceSummary } from "@shared/types/workspace";
import { DEFAULT_TIME_RANGE, TimeRange } from "../lib/timeRange";
import { trpc } from "../lib/trpc";
import { getWorkspaceHeaderValue, setWorkspaceHeaderValue } from "../lib/workspaceHeaders";

interface DashboardState {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  workspaceId?: number;
  setWorkspaceId: (workspaceId?: number) => void;
  workspaces: WorkspaceSummary[];
  workspacesLoading: boolean;
  workspacesError: boolean;
}

const DashboardContext = createContext<DashboardState | undefined>(undefined);

export function DashboardProvider({ children, user }: PropsWithChildren<{ user: SharedAuthUser }>) {
  const queryClient = useQueryClient();
  const workspacesQuery = trpc.workspaces.list.useQuery(undefined, { retry: 1 });

  const workspaces: WorkspaceSummary[] = useMemo(() => {
    if (workspacesQuery.data?.length) return workspacesQuery.data;
    if (user.workspaceId != null)
      return [{ id: user.workspaceId, name: `Workspace ${user.workspaceId}`, externalId: String(user.workspaceId) }];
    return [];
  }, [user.workspaceId, workspacesQuery.data]);

  const storedWorkspace = useMemo(() => {
    const cached = getWorkspaceHeaderValue();
    return cached ? Number.parseInt(cached, 10) : undefined;
  }, []);

  const initialWorkspaceId = useMemo(() => {
    if (storedWorkspace && workspaces.some(w => w.id === storedWorkspace)) return storedWorkspace;
    if (workspaces.length) return workspaces[0].id;
    if (user.workspaceId != null) return user.workspaceId;
    return undefined;
  }, [storedWorkspace, workspaces, user.workspaceId]);

  const [workspaceId, setWorkspaceId] = useState<number | undefined>(initialWorkspaceId);
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);

  useEffect(() => {
    setWorkspaceHeaderValue(workspaceId);
    queryClient.invalidateQueries();
  }, [queryClient, workspaceId]);

  useEffect(() => {
    if (initialWorkspaceId != null) {
      setWorkspaceId(initialWorkspaceId);
    }
  }, [initialWorkspaceId]);

  const value: DashboardState = useMemo(
    () => ({
      timeRange,
      setTimeRange,
      workspaceId,
      setWorkspaceId,
      workspaces,
      workspacesLoading: workspacesQuery.isLoading,
      workspacesError: Boolean(workspacesQuery.isError),
    }),
    [timeRange, workspaceId, workspaces, workspacesQuery.isLoading, workspacesQuery.isError],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardState() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboardState must be used within DashboardProvider");
  return ctx;
}
