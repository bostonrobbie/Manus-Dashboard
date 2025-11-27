import { useEffect, useMemo, useState } from "react";

type HealthState = "checking" | "ok" | "degraded";

interface HealthResponse {
  status?: string;
  db?: string;
}

export function useHealthStatus(intervalMs: number = 60_000) {
  const [status, setStatus] = useState<HealthState>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const check = async () => {
      try {
        const res = await fetch("/health");
        const data = (await res.json()) as HealthResponse;
        if (cancelled) return;
        if (res.ok && data.status === "ok" && data.db === "up") {
          setStatus("ok");
        } else {
          setStatus("degraded");
        }
      } catch {
        if (!cancelled) setStatus("degraded");
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
    if (status === "ok") return "System: OK";
    if (status === "checking") return "System: Checking...";
    return "System: Degraded";
  }, [status]);

  return { status, label };
}
