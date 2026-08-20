#!/usr/bin/env node
/**
 * check-family-core.mjs — verify lib/gate/* is byte-identical across the
 * plugin family repos (cc fork, pi, dsh) when siblings are present.
 * Exit 0 = consistent (or no siblings found, e.g. CI single checkout).
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAMILY = ["../codex-plugin-cc", "../codex-plugin-pi", "../codex-plugin-dsh"];
const GATE_DIR_CC = path.join("plugins", "codex", "scripts", "lib", "gate");
const GATE_DIR_FLAT = path.join("lib", "gate");
const FILES = ["gate-core.mjs", "gate-verdict.mjs", "gate-prompt.mjs", "gate-budget.mjs", "gate-learner.mjs", "gate-render.mjs"];

function gateDir(repoRoot) {
  for (const dir of [GATE_DIR_CC, GATE_DIR_FLAT]) {
    const full = path.join(repoRoot, dir);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function hash(file) {
  return createHash("md5").update(fs.readFileSync(file)).digest("hex");
}

const found = [];
for (const rel of FAMILY) {
  const root = path.resolve(ROOT, rel);
  const dir = gateDir(root);
  if (dir && fs.readdirSync(dir).length > 0) found.push({ name: path.basename(rel), dir });
}

if (found.length < 2) {
  console.log(`family-core check: ${found.length} repo(s) with gate core present — nothing to compare (OK).`);
  process.exit(0);
}

let ok = true;
for (const file of FILES) {
  const hashes = found.map((r) => {
    const f = path.join(r.dir, file);
    return { name: r.name, hash: fs.existsSync(f) ? hash(f) : "<missing>" };
  });
  const first = hashes[0].hash;
  const mismatch = hashes.some((h) => h.hash !== first);
  console.log(`${file}: ${mismatch ? "MISMATCH" : "identical"} ${hashes.map((h) => `${h.name}=${h.hash.slice(0, 8)}`).join(" ")}`);
  if (mismatch) ok = false;
}
process.exit(ok ? 0 : 1);
