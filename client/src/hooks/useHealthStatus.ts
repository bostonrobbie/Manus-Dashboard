import { useEffect, useMemo, useState } from "react";

type HealthState = "checking" | "ok" | "degraded";
type DbState = "unknown" | "up" | "down";

interface HealthResponse {
  status?: string;
  db?: string;
}

export interface HealthStatus {
  status: HealthState;
  db: DbState;
  lastCheckedAt?: string;
}

export function useHealthStatus(intervalMs: number = 60_000) {
  const [health, setHealth] = useState<HealthStatus>({ status: "checking", db: "unknown" });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const check = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4_000);

      try {
        const res = await fetch("/health", { signal: controller.signal });
        const data = (await res.json()) as HealthResponse;
        if (cancelled) return;

        const next: HealthStatus = {
          status: res.ok && data.status === "ok" && data.db === "up" ? "ok" : "degraded",
          db: data.db === "up" ? "up" : "down",
          lastCheckedAt: new Date().toISOString(),
        };

        setHealth(next);
      } catch {
        if (!cancelled) {
          setHealth({ status: "degraded", db: "down", lastCheckedAt: new Date().toISOString() });
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
    if (health.status === "ok" && health.db === "up") return "System: OK";
    return "System: Degraded";
  }, [health]);

  return { ...health, label };
}
