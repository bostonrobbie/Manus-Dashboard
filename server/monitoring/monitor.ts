import { createLogger } from "../utils/logger";

export type MonitoringContext = {
  endpoint?: string;
  userId?: number;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

const monitoringLogger = createLogger("monitoring");

export function captureException(error: unknown, context?: MonitoringContext) {
  const err = error instanceof Error ? error : new Error(String(error));
  monitoringLogger.error("Monitoring exception captured", {
    endpoint: context?.endpoint,
    userId: context?.userId,
    message: err.message,
    stack: err.stack,
    tags: context?.tags,
    extra: context?.extra,
    timestamp: new Date().toISOString(),
  });
  // TODO: Wire into Sentry/Datadog once credentials are available.
}

export function captureMessage(message: string, context?: MonitoringContext) {
  monitoringLogger.info("Monitoring message captured", {
    endpoint: context?.endpoint,
    userId: context?.userId,
    message,
    tags: context?.tags,
    extra: context?.extra,
    timestamp: new Date().toISOString(),
  });
  // TODO: Wire into Sentry/Datadog once credentials are available.
}
