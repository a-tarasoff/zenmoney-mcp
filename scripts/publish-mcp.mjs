#!/usr/bin/env node
// Publish server.json to the MCP registry (registry.modelcontextprotocol.io).
//
// The registry proves npm ownership by downloading the published tarball and
// reading `mcpName` out of its package.json, so the npm release always has to
// land first — and its rejection message for a mismatch is terse. Everything
// is therefore checked here before mcp-publisher is invoked:
//   1. mcp-publisher is installed
//   2. server.json name === package.json mcpName
//   3. server.json version === package.json version === packages[].version
//   4. that version is live on npm and its published mcpName matches
// Then: mcp-publisher login github (skipped when a token is cached) + publish.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tokenFile = join(repoRoot, ".mcpregistry_github_token");

function fail(message, hint) {
  console.error(`\nx ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

function run(cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", cwd: repoRoot });
}

function capture(cmd, args) {
  return execFileSync(cmd, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const server = JSON.parse(readFileSync(join(repoRoot, "server.json"), "utf8"));

try {
  capture("mcp-publisher", ["--version"]);
} catch {
  fail(
    "mcp-publisher is not on PATH.",
    "brew install mcp-publisher — or download a release from https://github.com/modelcontextprotocol/registry/releases"
  );
}

if (server.name !== pkg.mcpName) {
  fail(
    `server.json name (${server.name}) and package.json mcpName (${pkg.mcpName}) disagree.`,
    "The registry requires them to be identical."
  );
}

if (server.version !== pkg.version) {
  fail(
    `server.json version (${server.version}) does not match package.json (${pkg.version}).`
  );
}

const npmPkg = (server.packages ?? []).find((p) => p.registryType === "npm");

for (const p of server.packages ?? []) {
  if (p.version !== pkg.version) {
    fail(
      `server.json packages[${p.identifier}] is at ${p.version}, but package.json is at ${pkg.version}.`
    );
  }
}

if (npmPkg) {
  let publishedName;
  try {
    publishedName = capture("npm", [
      "view",
      `${npmPkg.identifier}@${pkg.version}`,
      "mcpName",
    ]);
  } catch {
    fail(
      `${npmPkg.identifier}@${pkg.version} is not on npm yet.`,
      "Run npm publish first — the registry reads mcpName out of the published tarball."
    );
  }
  if (publishedName !== server.name) {
    fail(
      `${npmPkg.identifier}@${pkg.version} on npm declares mcpName "${publishedName || "(none)"}", but this would publish "${server.name}".`,
      "Cut an npm release carrying the corrected mcpName, then re-run this."
    );
  }
}

console.log(
  `\nPublishing ${server.name} v${server.version}` +
    (npmPkg ? ` (npm: ${npmPkg.identifier}@${pkg.version})` : "")
);

if (!existsSync(tokenFile)) {
  console.log("\nNo cached registry token — starting GitHub login.");
  run("mcp-publisher", ["login", "github"]);
}

try {
  run("mcp-publisher", ["publish"]);
} catch {
  fail(
    "mcp-publisher publish failed.",
    `If it rejected your credentials, delete ${tokenFile} and re-run to log in again. The io.github.<user> namespace has to match the GitHub account you authenticate as.`
  );
}

console.log(`\nPublished ${server.name} v${server.version} to the MCP registry.`);
