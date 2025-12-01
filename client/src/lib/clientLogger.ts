export interface ClientLogExtra {
  [key: string]: unknown;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === "object") return error;
  return { message: String(error) };
}

export function logClientError(source: string, error: unknown, extra?: ClientLogExtra) {
  const payload = { source, error: serializeError(error), ...extra };
  console.error("[client-error]", payload);
}
