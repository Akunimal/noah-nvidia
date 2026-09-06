import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(repoRoot, "tests", "evals", "promptfoo", "promptfooconfig.yaml");
const outputDir = path.join(repoRoot, ".promptfoo");
const outputPath = path.join(outputDir, "local-results.json");
const evidencePath = path.join(repoRoot, "evidence", "promptfoo-local.md");

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.dirname(evidencePath), { recursive: true });

const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npx";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "npx.cmd", "--yes", "promptfoo@0.122.2", "eval", "-c", configPath, "-o", outputPath, "--no-cache", "--no-share"]
  : ["--yes", "promptfoo@0.122.2", "eval", "-c", configPath, "-o", outputPath, "--no-cache", "--no-share"];

const child = spawn(command, args, {
  cwd: repoRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    PROMPTFOO_DISABLE_TELEMETRY: "1",
    PROMPTFOO_DISABLE_UPDATE: "1",
    PROMPTFOO_DISABLE_REMOTE_GENERATION: "1",
    PROMPTFOO_DISABLE_SHARING: "1",
    PROMPTFOO_SELF_HOSTED: "1",
  },
});

child.on("error", (error) => {
  console.error(`Could not start Promptfoo: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (code !== 0) {
    console.error(`Promptfoo exited with ${signal ? `signal ${signal}` : `status ${code}`}.`);
    process.exitCode = code || 1;
    return;
  }

  const payload = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  const rows = payload.results?.results || payload.results || [];
  const resultRows = Array.isArray(rows) ? rows : [];
  const failed = resultRows.filter((row) => row.success === false || row.error);
  const passed = resultRows.length - failed.length;
  const generatedAt = new Date().toISOString();

  const evidence = [
    "# Promptfoo local evaluation",
    "",
    `- Generated: ${generatedAt}`,
    "- Mode: offline deterministic synthetic provider",
    "- Provider: `deterministic-demo`",
    "- Model label: `local-onboarding-fixture-v1`",
    `- Cases: ${resultRows.length}`,
    `- Passed: ${passed}`,
    `- Failed: ${failed.length}`,
    "- External effects: disabled",
    "- Network model calls: none",
    "- Canonical prompt: `services/api/onboarding-system-prompt.txt`",
    "- Schema: `contracts/onboarding.v1.schema.json`",
    "",
    "This report validates the Promptfoo harness, strict onboarding contract,",
    "missing-field behavior, prompt-injection boundary, provider provenance,",
    "and synthetic labeling. It is not a connected Nemotron quality result.",
    "",
  ].join("\n");

  fs.writeFileSync(evidencePath, evidence, "utf8");
  console.log(`Promptfoo local evidence written to ${path.relative(repoRoot, evidencePath)}`);
});
