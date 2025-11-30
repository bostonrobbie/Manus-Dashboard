import { env } from "./env";

type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown> | undefined;

function emit(level: LogLevel, message: string, meta?: LogMeta, component?: string) {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    mode: env.modeLabel,
    message,
  };

  if (component) payload.component = component;
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      if (value !== undefined) {
        payload[key] = value;
      }
    }
  }

  const serialized = JSON.stringify(payload);
  if (level === "info") console.log(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.error(serialized);
}

export function createLogger(component?: string) {
  return {
    info: (message: string, meta?: LogMeta) => emit("info", message, meta, component),
    warn: (message: string, meta?: LogMeta) => emit("warn", message, meta, component),
    error: (message: string, meta?: LogMeta) => emit("error", message, meta, component),
  };
}

export const logger = createLogger();
