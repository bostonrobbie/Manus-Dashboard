import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";

import { loadManusConfig } from "@server/config/manus";
import type { AppRouter } from "@server/index";

const config = loadManusConfig();
const allowDegraded = (process.env.SMOKE_ALLOW_DEGRADED ?? "false").toLowerCase() === "true";

async function fetchJson(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
  } catch (error) {
    throw new Error(`Request failed (${res.status}): ${text} (${(error as Error).message})`);
  }
}

async function main() {
  const baseUrl = (process.env.SMOKE_BASE_URL ?? `http://localhost:${config.port}`).replace(/\/$/, "");
  const userHeaderName = process.env.MANUS_AUTH_HEADER_USER ?? process.env.MANUS_AUTH_HEADER ?? "x-manus-user";
  const workspaceHeaderName =
    process.env.MANUS_AUTH_HEADER_WORKSPACE ?? process.env.MANUS_WORKSPACE_HEADER ?? "x-manus-workspace";
  const userHeaderValue = process.env.SMOKE_AUTH_HEADER_VALUE ?? process.env.VITE_MANUS_AUTH_TOKEN ?? "user:1";
  const workspaceHeaderValue = process.env.SMOKE_WORKSPACE_HEADER_VALUE ?? process.env.SMOKE_WORKSPACE_ID ?? "1";

  console.log(`[smoke] Target: ${baseUrl} (mode=${config.modeLabel})`);
  console.log(`[smoke] Headers: ${userHeaderName}, ${workspaceHeaderName}`);

  const health = await fetchJson(`${baseUrl}/health`);
  console.log(`[smoke] /health -> ${health.status}`);

  const fullRes = await fetch(`${baseUrl}/health/full`);
  const fullText = await fullRes.text();
  let fullHealth: Record<string, any> = {};
  try {
    fullHealth = fullText ? JSON.parse(fullText) : {};
  } catch (error) {
    if (!allowDegraded) {
      throw new Error(`/health/full returned non-JSON (${(error as Error).message})`);
    }
  }
  console.log(`[smoke] /health/full -> status=${fullRes.status}, db=${fullHealth.db}, workspaces=${fullHealth.workspaces}, uploads=${fullHealth.uploads}`);

  if (!allowDegraded && !fullRes.ok) {
    throw new Error(`/health/full returned ${fullRes.status}: ${fullText}`);
  }

  const headers: Record<string, string> = {};
  if (userHeaderValue) headers[userHeaderName] = userHeaderValue;
  if (workspaceHeaderValue) headers[workspaceHeaderName] = workspaceHeaderValue;

  const trpc = createTRPCProxyClient<AppRouter>({
    transformer: SuperJSON,
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        headers,
      }),
    ],
  });

  const workspaces = await trpc.workspaces.list.query();
  console.log(`[smoke] workspaces.list -> ${workspaces.length} results`);

  console.log("[smoke] Success");
}

main().catch(error => {
  console.error("[smoke] failed", error);
  process.exitCode = 1;
});
