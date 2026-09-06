import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonicalPrompt = fs
  .readFileSync(
    path.resolve(here, "../../..", "services", "api", "onboarding-system-prompt.txt"),
    "utf8",
  )
  .trim();

const businessFields = ["name", "description", "category", "timezone", "currency", "locale"];

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function firstMatch(input, pattern) {
  const match = input.match(pattern);
  return match?.[1]?.trim() || null;
}

function buildDraft(input) {
  const normalized = input.replace(/\s+/g, " ").trim();
  const name = firstMatch(
    normalized,
    /\b(?:we are|our business is|business name is|company name is)\s+([^,.;]+?)(?=,|\.|;|$)/i,
  );
  const descriptionAfterName = name
    ? firstMatch(
        normalized.slice(normalized.toLowerCase().indexOf(name.toLowerCase()) + name.length),
        /^\s*,\s*([^.;]+?)(?=\.|;|$)/,
      )
    : null;
  const description =
    descriptionAfterName ||
    firstMatch(normalized, /\b(?:we provide|we offer|we deliver)\s+([^.;]+?)(?=\.|;|$)/i);
  const category = firstMatch(
    description || normalized,
    /\b(?:an?|the)\s+(.+?)\s+(?:company|business|agency|studio|shop|service|services)\b/i,
  );
  const timezone = firstMatch(normalized, /\b([A-Za-z]+\/[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)?)\b/);
  const currency = firstMatch(normalized, /\b(?:use|using|currency(?: is)?|charge in)\s+([A-Z]{3})\b/i);
  const locale = firstMatch(normalized, /\b([a-z]{2}-[A-Z]{2})\b/);

  const inventory = [];
  const inventoryText = firstMatch(normalized, /\binventory\s*:\s*(.+)$/i);
  if (inventoryText && !/^(?:none|nothing|not provided)\.?$/i.test(inventoryText.trim())) {
    for (const rawItem of inventoryText.replace(/\.$/, "").split(";")) {
      const item = rawItem.trim();
      const match = item.match(/^(\d+(?:\.\d+)?)\s+(.+?)(?:\s+\(SKU\s+([A-Za-z0-9_-]+)\))?$/i);
      if (!match) continue;
      inventory.push({
        name: match[2].trim(),
        sku: match[3] || null,
        quantity: Number(match[1]),
        unit: null,
      });
    }
  }

  const business = {
    name,
    description,
    category,
    timezone,
    currency,
    locale,
  };
  const missing_fields = businessFields
    .filter((field) => business[field] === null)
    .map((field) => `business.${field}`);
  if (inventory.length === 0) missing_fields.push("inventory");

  return {
    schema_version: "onboarding.v1",
    business,
    inventory,
    missing_fields,
  };
}

export default class LocalOnboardingProvider {
  constructor(options = {}) {
    this.providerId = options.id || "noah-local-onboarding";
    this.config = options.config || {};
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context = {}) {
    const input = typeof context.vars?.input === "string" ? context.vars.input : "";
    const promptMatchesCanonicalContract = prompt.includes(canonicalPrompt);
    const draft = promptMatchesCanonicalContract ? buildDraft(input) : { contract_error: "PROMPT_DRIFT" };
    const metadata = {
      provider: "deterministic-demo",
      model: "local-onboarding-fixture-v1",
      synthetic: true,
      external_effects: false,
      prompt_sha256: hash(canonicalPrompt),
      input_sha256: hash(input),
      prompt_contract_match: promptMatchesCanonicalContract,
    };

    return {
      output: JSON.stringify(draft),
      metadata,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
    };
  }
}
