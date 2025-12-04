import { performance } from "node:perf_hooks";

import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";

import type { AppRouter } from "@server/routers";
const iterations = Number(process.env.STRESS_ITERATIONS ?? 10);
const baseUrl = process.env.STRESS_BASE_URL ?? "http://localhost:3001/trpc";

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: baseUrl,
      headers() {
        return {
          "x-user-id": "1",
        };
      },
    }),
  ],
});

async function time<T>(fn: () => Promise<T>): Promise<{ ms: number; value: T }> {
  const start = performance.now();
  const value = await fn();
  const ms = performance.now() - start;
  return { ms, value };
}

async function main() {
  const timings: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const { ms } = await time(() =>
      client.portfolio.overview.query({ timeRange: "ALL", startingCapital: 100000 }).catch(err => {
        console.error("overview failed", err);
        return null as any;
      }),
    );
    timings.push(ms);

    await time(() => client.portfolio.strategyComparison.query({ page: 1, pageSize: 5, timeRange: { preset: "3M" } }));
    await time(() => client.portfolio.trades.query({ page: 1, pageSize: 25, timeRange: { preset: "3M" } }));
  }

  timings.sort((a, b) => a - b);
  const median = timings[Math.floor(timings.length / 2)] ?? 0;
  const p95 = timings[Math.floor(timings.length * 0.95)] ?? 0;
  console.log({
    iterations,
    minMs: timings[0],
    medianMs: median,
    p95Ms: p95,
    maxMs: timings[timings.length - 1],
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
