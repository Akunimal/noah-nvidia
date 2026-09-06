const ROOT_KEYS = ["business", "inventory", "missing_fields", "schema_version"];
const BUSINESS_KEYS = ["category", "currency", "description", "locale", "name", "timezone"];
const MISSING_FIELDS = new Set([
  "business.name",
  "business.description",
  "business.category",
  "business.timezone",
  "business.currency",
  "business.locale",
  "inventory",
]);

function sameArray(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function expectedValue(vars, key) {
  return vars[key] === "" || vars[key] == null ? null : vars[key];
}

function expectedArray(vars, key) {
  const value = vars[key];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function expectedBoolean(vars, key, fallback) {
  if (!(key in vars)) return fallback;
  return vars[key] === true || vars[key] === "true";
}

function comparableText(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/^(?:an?|the)\s+/, "").replace(/[.]+$/, "")
    : value;
}

module.exports = (output, context = {}) => {
  const vars = context.vars || {};
  const metadata = context.metadata || context.providerResponse?.metadata || {};
  const problems = [];
  let draft;

  try {
    draft = typeof output === "string" ? JSON.parse(output) : output;
  } catch {
    return { pass: false, score: 0, reason: "output is not parseable JSON" };
  }

  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    problems.push("output is not an object");
  } else {
    if (!sameArray(Object.keys(draft).sort(), ROOT_KEYS.slice().sort())) {
      problems.push("root keys drifted from onboarding.v1");
    }
    if (draft.schema_version !== "onboarding.v1") problems.push("schema_version mismatch");
    if (!draft.business || typeof draft.business !== "object" || Array.isArray(draft.business)) {
      problems.push("business is not an object");
    } else if (!sameArray(Object.keys(draft.business).sort(), BUSINESS_KEYS.slice().sort())) {
      problems.push("business keys drifted from onboarding.v1");
    }

    const business = draft.business || {};
    if (business.name !== expectedValue(vars, "expected_name")) problems.push("business.name mismatch");
    if (comparableText(business.description) !== comparableText(expectedValue(vars, "expected_description"))) {
      problems.push("business.description mismatch");
    }
    if (business.category !== expectedValue(vars, "expected_category")) problems.push("business.category mismatch");
    if (business.timezone !== expectedValue(vars, "expected_timezone")) problems.push("business.timezone mismatch");
    if (business.currency !== expectedValue(vars, "expected_currency")) problems.push("business.currency mismatch");
    if (business.locale !== expectedValue(vars, "expected_locale")) problems.push("business.locale mismatch");

    const expectedMissing = expectedArray(vars, "expected_missing_fields");
    if (!sameArray(draft.missing_fields, expectedMissing)) problems.push("missing_fields mismatch");
    if (!Array.isArray(draft.missing_fields) || draft.missing_fields.some((field) => !MISSING_FIELDS.has(field))) {
      problems.push("missing_fields contains an unknown path");
    }

    const inventory = Array.isArray(draft.inventory) ? draft.inventory : [];
    if (inventory.length !== Number(vars.expected_inventory_count || 0)) problems.push("inventory count mismatch");
    const actualSkus = inventory.map((item) => item.sku).filter((sku) => sku !== null);
    if (!sameArray(actualSkus, expectedArray(vars, "expected_inventory_skus"))) problems.push("inventory SKU mismatch");
  }

  const expectedProvider = vars.expected_provider || "deterministic-demo";
  const expectedModel = vars.expected_model || "local-onboarding-fixture-v1";
  const expectedSynthetic = expectedBoolean(vars, "expected_synthetic", true);
  const expectedExternalEffects = expectedBoolean(vars, "expected_external_effects", false);
  if (metadata.provider !== expectedProvider) problems.push("provider provenance mismatch");
  if (metadata.model !== expectedModel) problems.push("model provenance mismatch");
  if (metadata.synthetic !== expectedSynthetic) problems.push("synthetic marker mismatch");
  if (metadata.external_effects !== expectedExternalEffects) problems.push("external effects marker mismatch");

  const passed = problems.length === 0;
  return {
    pass: passed,
    score: passed ? 1 : 0,
    reason: passed ? "strict onboarding contract and provenance passed" : problems.join("; "),
  };
};
