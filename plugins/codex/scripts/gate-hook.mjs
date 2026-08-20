#!/usr/bin/env node
/**
 * gate-hook.mjs — Claude Code hook wiring for the full-lifecycle gate.
 *
 * PreToolUse: when the gate is on, block commit-like commands until a
 *   completion-gate PASS is recorded for the current plan (state key).
 * Stop: when the gate is on, run the completion gate before Claude stops
 *   (pattern adapted from upstream stop-review-gate-hook.mjs, calling the
 *   fork's gate runtime instead of the upstream review task).
 *
 * Fork addition (imBlanker). Derived from openai/codex-plugin-cc (Apache-2.0).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { getConfig, loadState, resolveStateDir, setConfig } from "./lib/state.mjs";
import { runStage } from "./lib/gate/gate-core.mjs";

const ROOT_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const GATE_CONFIG_KEY = "reviewGate";
const COMPLETION_PASS_KEY = "gateCompletionPassAt";

const COMMIT_PATTERN = /\b(git\s+(commit|push|merge|rebase|tag)|npm\s+publish|gh\s+(pr\s+merge|release\s+create))\b/;

function readHookInput() {
  return new Promise((resolve) => {
    let raw = "";
    process.stdin.on("data", (chunk) => {
      raw += chunk;
    });
    process.stdin.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function emitPreToolUse(blocked, reason) {
  // Claude Code PreToolUse exit-0 JSON protocol
  console.log(JSON.stringify(blocked ? { decision: "block", reason } : { decision: "approve" }));
}

async function main() {
  const hookInput = await readHookInput();
  const hookName = process.argv[2] ?? "";
  const cwd = hookInput.cwd ?? process.cwd();
  const stateDir = resolveStateDir(cwd);

  if (hookName === "PreToolUse") {
    const gateOn = getConfig(cwd)?.[GATE_CONFIG_KEY] === true;
    if (!gateOn) {
      emitPreToolUse(false);
      return;
    }
    const command = String(hookInput.tool_input?.command ?? "");
    if (!COMMIT_PATTERN.test(command)) {
      emitPreToolUse(false);
      return;
    }
    const config = getConfig(cwd);
    const passedAt = config?.[COMPLETION_PASS_KEY];
    const fresh = typeof passedAt === "number" && Date.now() - passedAt < 30 * 60_000;
    if (fresh) {
      emitPreToolUse(false);
      return;
    }
    emitPreToolUse(
      true,
      "Codex review gate: commit-like command blocked. Run `/codex:gate completion --diff` and get a PASS first (gate Completion), or turn the gate off with `/codex:gate off`."
    );
    return;
  }

  if (hookName === "Stop") {
    const gateOn = getConfig(cwd)?.[GATE_CONFIG_KEY] === true;
    if (!gateOn) {
      process.exit(0);
    }
    const planFile = path.join(stateDir, "gate-plan.md");
    const plan = fs.existsSync(planFile) ? fs.readFileSync(planFile, "utf8") : "";
    const envelope = await runStage(
      "completion",
      { cwd, plan, tier: "minor", diff: "" },
      { host: "codex-plugin-cc-stop" }
    );
    if (envelope.verdict === "pass") {
      setConfig(cwd, COMPLETION_PASS_KEY, Date.now());
      process.stderr.write(`Codex gate: completion PASS — ${envelope.reasons?.[0] ?? "approved"}\n`);
      process.exit(0);
    }
    process.stderr.write(
      `Codex gate: completion FAIL — stopping is allowed, but commit remains blocked.\n${envelope.reasons?.join("\n") ?? ""}\n`
    );
    process.exit(0); // do not hard-block Claude's stop; commits stay gated
  }

  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`gate-hook error: ${error?.message ?? error}\n`);
  process.exit(0); // hooks must never wedge the host
});
