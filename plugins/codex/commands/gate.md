---
description: Toggle the full-lifecycle Codex review gate (plan / realtime / completion) or run a gate stage manually
argument-hint: 'on|off|status | plan "<plan text>" | completion [--tier major|minor|other]'
allowed-tools: Bash(node:*), Bash(git:*), Read
---

Control the Codex review gate — every task runs plan → execution-with-realtime-follow → completion, each stage gated by a Codex verdict (PASS auto-proceeds; FAIL loops back with reasons). Effort/model per stage is chosen by the OS-global learner (shared with codex-plugin-pi / codex-plugin-dsh), seeded from artificialanalysis.ai latency data. Not subject to any price gate.

Raw arguments: `$ARGUMENTS`

## Toggle

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" gate learner status   # learner health
```

- `on` / `off` / `status`: run

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" gate status --json
```

and follow its instructions to flip the `reviewGate` config (the hook reads the same state).

## Workflow contract (when the gate is ON)

1. Before executing anything non-trivial, present the plan and run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" gate plan --tier <major|minor|other> --json <plan text or --file>
```

   PASS (`verdict:"pass"`) → proceed. FAIL → revise the plan addressing every reason, re-run. Do not start executing before PASS.

2. During execution, for long-running commands, feed output segments:

```bash
<command> 2>&1 | node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" gate follow --plan-file <path> --stdin --json
```

   FAIL (halt-chain) → stop the current chain immediately and replan.

3. Before declaring done or committing, run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" gate completion --tier <tier> --diff --plan-file <path> --json
```

   The Stop hook enforces this when the gate is on; commit-like commands are blocked by the PreToolUse hook until completion PASS.

Return verdict JSON verbatim to the user; never paraphrase FAIL reasons away.
