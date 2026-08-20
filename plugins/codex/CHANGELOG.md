# Changelog

## 0.2.0 (2026-08-20) — imBlanker fork: full-lifecycle review gate

- Three-stage Codex review gate (plan / realtime follow / completion) with
  PASS auto-proceed, budget-aware adaptive effort, fail-open timeouts.
- OS-global latency learner shared with codex-plugin-pi/-dsh
  (`$XDG_STATE_HOME/codex-review-learner`), seeded from
  artificialanalysis.ai data (methodology-cited, conservative).
- `/codex:gate` command family; PreToolUse commit-block + Stop completion
  gate hooks; budgets 15m/10m/1m/30s; no price-gate coupling.
- `runAppServerTurn` gains `disableBroker` (gate runs broker-less; no lazy
  broker leaks).

## 1.0.0

- Initial version of the Codex plugin for Claude Code
