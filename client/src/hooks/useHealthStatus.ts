import { useEffect, useMemo, useState } from "react";

type HealthState = "checking" | "ok" | "degraded" | "error";
type DbState = "unknown" | "up" | "down";

interface HealthResponse {
  status?: string;
  mode?: string;
  manusReady?: boolean;
  mockUser?: boolean;
  timestamp?: string;
  warnings?: string[];
}

interface FullHealthResponse extends HealthResponse {
  db?: "ok" | "error";
  workspaces?: "ok" | "error";
  uploads?: "ok" | "error";
  auth?: "ok" | "warning" | "error";
  details?: Record<string, string | undefined>;
}

export interface HealthStatus {
  status: HealthState;
  db: DbState;
  lastCheckedAt?: string;
  mode?: string;
  manusReady?: boolean;
  mockUser?: boolean;
  warnings: string[];
  full?: FullHealthResponse;
}

export function useHealthStatus(intervalMs: number = 60_000) {
  const [health, setHealth] = useState<HealthStatus>({ status: "checking", db: "unknown", warnings: [] });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const check = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4_000);

      try {
        const basicRes = await fetch("/health", { signal: controller.signal });
        const basicData = (await basicRes.json()) as HealthResponse;

        let fullData: FullHealthResponse | undefined;
        try {
          const fullRes = await fetch("/health/full", { signal: controller.signal });
          if (fullRes.ok) {
            fullData = (await fullRes.json()) as FullHealthResponse;
          }
        } catch {
          // ignore full health failures, basic still surfaces
        }

        if (cancelled) return;

        const dbState: DbState = fullData ? (fullData.db === "ok" ? "up" : "down") : "unknown";
        const warnings = [...(basicData.warnings ?? []), ...(fullData?.warnings ?? [])];

        const status: HealthState = (() => {
          if (!basicRes.ok) return "degraded";
          if (fullData && fullData.status === "error") return "error";
          if (fullData && fullData.db === "error") return "degraded";
          if (basicData.status === "ok") return "ok";
          return "degraded";
        })();

        const next: HealthStatus = {
          status,
          db: dbState,
          lastCheckedAt: basicData.timestamp ?? new Date().toISOString(),
          mode: basicData.mode,
          manusReady: basicData.manusReady,
          mockUser: basicData.mockUser,
          warnings,
          full: fullData,
        };

        setHealth(next);
      } catch {
        if (!cancelled) {
          setHealth({ status: "degraded", db: "down", lastCheckedAt: new Date().toISOString(), warnings: [] });
        }
      } finally {
        clearTimeout(timeout);
      }
    };

    check();
    timer = setInterval(check, intervalMs);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [intervalMs]);

  const label = useMemo(() => {
    if (health.status === "checking") return "System: Checking...";
    if (health.status === "ok" && (health.db === "up" || health.db === "unknown")) {
      return health.mode ? `System: ${health.mode}` : "System: OK";
    }
    if (health.mode === "MANUS" && health.manusReady === false) {
      return "System: Manus auth missing";
    }
    return "System: Degraded";
  }, [health]);

  return { ...health, label };
}
