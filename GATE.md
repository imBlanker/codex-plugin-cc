# Full-Lifecycle Review Gate (family feature)

This fork adds a three-stage Codex review gate, kept in lockstep with
[codex-plugin-pi](https://github.com/imBlanker/codex-plugin-pi) and
[codex-plugin-dsh](https://github.com/imBlanker/codex-plugin-dsh) (all at
0.2.0). The gate core (`scripts/lib/gate/`) is byte-identical across the
three repos.

## Stages
1. **Plan gate** — `/codex:gate plan "<plan>"` before execution; FAIL loops
   back with reasons (auto-accepted PASS proceeds).
2. **Realtime follow** — pipe command output through `gate follow --stdin`;
   a FAIL verdict means halt-chain → replan.
3. **Completion gate** — `gate completion --diff` before delivery; the Stop
   hook runs it when the gate is on, and the PreToolUse hook blocks
   commit-like commands until a fresh PASS.

## Toggle
`/codex:gate on|off|status` (per-workspace). `gate learner status` shows the
OS-global effort/model learner (shared store across all three host plugins;
seeded from artificialanalysis.ai latency data, replaced by local
measurements after burn-in).

## Budgets
major stage 15min · minor stage 10min · other 1min · realtime segment ~30s.
Effort per call = max effort fitting the budget (learner/seed table);
never price-gated.

## Fork policy vs upstream
Gate code lives in new files + three additive touches:
`scripts/codex-companion.mjs` (gate dispatch + disableBroker option in
lib/codex.mjs), `hooks/hooks.json` (PreToolUse + gate Stop), and
`commands/gate.md`. Upstream sync = merge upstream/main → re-run
`node scripts/sync-family-core.mjs check` (coming with pi/dsh 0.2.0).
