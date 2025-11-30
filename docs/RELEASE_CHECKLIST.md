# Release Checklist

- [ ] Increment the version if applicable and confirm `/version` reports the new value (and commit hash when provided).
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test:all`.
- [ ] Run Playwright smoke tests (`pnpm e2e`) when feasible.
- [ ] Optionally run the stress harness (`node server/scripts/stress-queries.ts`) and record regressions.
- [ ] Review `docs/QA_WEAKNESSES.md` for unresolved items and note any new risks.
- [ ] Verify `docs/DOMAIN_MODEL.md`, `docs/ARCHITECTURE.md`, and `docs/MANUS_HANDOFF.md` stay accurate after major changes.
- [ ] Tag the release in Git with a short summary of key changes.
