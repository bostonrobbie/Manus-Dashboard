import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { SharedAuthUser } from "@shared/types/auth";
import { isAdminUser } from "@shared/utils/auth";
import type { WorkspaceSummary } from "@shared/types/workspace";
import { DEFAULT_TIME_RANGE, TimeRange } from "../lib/timeRange";
import { setWorkspaceHeaderValue } from "../lib/workspaceHeaders";

interface DashboardState {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  workspaceId?: number;
  setWorkspaceId: (workspaceId?: number) => void;
  workspaces: WorkspaceSummary[];
  workspacesLoading: boolean;
  workspacesError: boolean;
  user: SharedAuthUser;
  isAdmin: boolean;
}

const DashboardContext = createContext<DashboardState | undefined>(undefined);

export function DashboardProvider({ children, user }: PropsWithChildren<{ user: SharedAuthUser }>) {
  const queryClient = useQueryClient();
  const workspaces = useMemo<WorkspaceSummary[]>(() => [], []);
  const [workspaceId, setWorkspaceId] = useState<number | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  useEffect(() => {
    setWorkspaceHeaderValue(workspaceId);
    queryClient.invalidateQueries();
  }, [queryClient, workspaceId]);

  const value: DashboardState = useMemo(
    () => ({
      timeRange,
      setTimeRange,
      workspaceId,
      setWorkspaceId,
      workspaces,
      workspacesLoading: false,
      workspacesError: false,
      user,
      isAdmin,
    }),
    [timeRange, workspaceId, workspaces, user, isAdmin],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardState() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboardState must be used within DashboardProvider");
  return ctx;
}
