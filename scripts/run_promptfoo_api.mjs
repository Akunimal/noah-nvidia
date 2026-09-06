import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(repoRoot, "tests", "evals", "promptfoo", "promptfooconfig.api.yaml");
const outputDir = path.join(repoRoot, ".promptfoo");
const outputPath = path.join(outputDir, "api-results.json");
const evidencePath = path.join(repoRoot, "evidence", "promptfoo-api.md");

if (!process.env.NOAH_EVAL_API_BASE_URL) {
  console.error("NOAH_EVAL_API_BASE_URL is required; no connected evaluation was run.");
  process.exit(1);
}
if (!process.env.NOAH_EVAL_API_BEARER && !process.env.NOAH_EVAL_PUBLIC_WORKSPACE) {
  console.error("Set NOAH_EVAL_API_BEARER or NOAH_EVAL_PUBLIC_WORKSPACE privately; no connected evaluation was run.");
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.dirname(evidencePath), { recursive: true });

const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npx";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "npx.cmd", "--yes", "promptfoo@0.122.2", "eval", "-c", configPath, "-o", outputPath, "--no-cache", "--no-share", "--max-concurrency", "1"]
  : ["--yes", "promptfoo@0.122.2", "eval", "-c", configPath, "-o", outputPath, "--no-cache", "--no-share", "--max-concurrency", "1"];

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
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch {
    console.error("Promptfoo did not produce a readable result file.");
    process.exitCode = code || 1;
    return;
  }

  const rows = payload.results?.results || payload.results || [];
  const resultRows = Array.isArray(rows) ? rows : [];
  const failed = resultRows.filter((row) => row.success === false || row.error);
  const passed = resultRows.length - failed.length;
  const endpoint = new URL(process.env.NOAH_EVAL_API_BASE_URL).origin;
  const evidence = [
    "# Promptfoo connected API evaluation",
    "",
    `- Generated: ${new Date().toISOString()}`,
    "- Mode: connected synthetic onboarding descriptions through Noah API",
    `- Endpoint origin: \`${endpoint}\``,
    "- Expected provider: `nebius`",
    "- Expected model: `nvidia/nemotron-3-super-120b-a12b`",
    `- Cases: ${resultRows.length}`,
    `- Passed: ${passed}`,
    `- Failed/errors: ${failed.length}`,
    "- External effects: disabled",
    "- OpenCode2API: not used by the API route",
    "- Inputs: synthetic only",
    "- Raw Promptfoo output: ignored in `.promptfoo/`",
    "",
    "This report records contract/provenance parity through the deployed Noah API.",
    "It does not store bearer values, model output, private prompts, or response bodies.",
    "",
  ].join("\n");
  fs.writeFileSync(evidencePath, evidence, "utf8");
  console.log(`Promptfoo connected API evidence written to ${path.relative(repoRoot, evidencePath)}`);

  if (code !== 0) {
    console.error(`Promptfoo exited with ${signal ? `signal ${signal}` : `status ${code}`}.`);
    process.exitCode = code || 1;
  }
});
