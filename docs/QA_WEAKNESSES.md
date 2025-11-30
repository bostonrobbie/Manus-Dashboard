# QA Weaknesses and Observations

- Domain and architecture coverage is documented in `docs/DOMAIN_MODEL.md` and `docs/ARCHITECTURE.md`, but scenario-based QA still leans on manual validation. Test cases should trace workspace/strategy expectations explicitly.
- Property-based checks in `server/tests/metricsProperty.test.ts` exercise drawdown bounds and expectancy math; numerical stability beyond the sampled ranges is unproven for extreme volatility paths.
- Risk guidance recommendations remain heuristic and should be calibrated against real workspaces; extremely negative expectancy clamps risk to a minimal value without operator prompts.
- Stress and load coverage is ad hoc. Use `node server/scripts/stress-queries.ts` alongside `pnpm test:all` to probe large workspaces; we do not yet gate releases on stress outcomes.
- Playwright smoke tests (`pnpm e2e`) cover navigation only. There is no visual regression suite or device/browser matrix; UI regressions may slip through without manual review.
- Duplicate-trade protections rely on DB unique indexes plus natural keys; regression tests with varied precision and repeated CSV uploads are still sparse.
- RBAC relies on Manus headers, workspace membership, and ownership; multi-tenant permutations (viewer/editor/admin/owner) should be revalidated in Manus-hosted environments before major releases.
- Audit logs record uploads and admin soft-deletes but are not monitored for volume growth; rotation/archival policies remain manual.
