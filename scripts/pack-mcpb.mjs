#!/usr/bin/env node
// Build a clean MCPB bundle in dist/ using a staging directory.
// Steps:
//   1. npm run build         (compile TS -> build/)
//   2. copy manifest.json, package.json, build/, README, LICENSE -> .mcpb-stage/
//   3. npm install --omit=dev --no-audit --no-fund in staging
//   4. npx mcpb pack .mcpb-stage dist/zenmoney-mcp-<version>.mcpb

import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stageDir = join(repoRoot, ".mcpb-stage");
const distDir = join(repoRoot, "dist");
const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const outFile = join(distDir, `zenmoney-mcp-${pkg.version}.mcpb`);

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

run("npm run build", { cwd: repoRoot });

rmSync(stageDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });
mkdirSync(distDir, { recursive: true });

for (const entry of ["manifest.json", "package.json", "package-lock.json", "build", "README.md", "LICENSE"]) {
  const src = join(repoRoot, entry);
  if (!existsSync(src)) continue;
  cpSync(src, join(stageDir, entry), { recursive: true });
}

run("npm install --omit=dev --ignore-scripts --no-audit --no-fund", { cwd: stageDir });

rmSync(outFile, { force: true });
run(`npx --yes @anthropic-ai/mcpb pack "${stageDir}" "${outFile}"`, { cwd: repoRoot });

console.log(`\n✓ Bundle written to ${outFile}`);
