import test from "node:test";
import assert from "node:assert/strict";
import { calculateScenario, allocateOperatingCost, comparable } from "../../../tools/web3-growth-planner/calculate.ts";
import { validateModel, parseModel, MAX_JSON_BYTES } from "../../../tools/web3-growth-planner/model.ts";
import { encodeShare, decodeShare, shareModel, HASH_PREFIX, MAX_ENCODED_LENGTH } from "../../../tools/web3-growth-planner/codec.ts";
import { preset } from "../../../tools/web3-growth-planner/presets.ts";
import { summaryLines } from "../../../tools/web3-growth-planner/report.ts";

function fixture() {
  const m = preset("kol", "en");
  const s = m.scenarios[0];
  s.channels = [s.channels[0]];
  s.channels[0].rawParticipants = 1000;
  s.operatingCost = 100;
  return m;
}

test("contract: 400 activated, 100 retained, 200 rewarded, 1500 total, 3.75 / 15", () => {
  const m = fixture(), r = calculateScenario(m.scenarios[0]);
  assert.equal(validateModel(m).ok, true);
  assert.deepEqual([r.activated, r.retained, r.rewarded, r.rewardCost, r.operatingCost, r.totalCost, r.costPerActivated, r.costPerRetained], [400, 100, 200, 400, 100, 1500, 3.75, 15]);
});

test("zero outcomes are unavailable, zero costs are valid zero economics", () => {
  const s = fixture().scenarios[0], c = s.channels[0];
  c.rawParticipants = c.eligibleParticipants = 0;
  let r = calculateScenario(s);
  assert.equal(r.activationRate, null); assert.equal(r.costPerActivated, null); assert.equal(r.costPerRetained, null); assert.equal(r.rewardCost, 0);
  c.rawParticipants = c.eligibleParticipants = 1000; c.activationRate = 0;
  r = calculateScenario(s); assert.equal(r.activated, 0); assert.equal(r.costPerActivated, null);
  c.activationRate = 40; c.retentionRate = 0;
  r = calculateScenario(s); assert.equal(r.retained, 0); assert.equal(r.costPerRetained, null);
  c.retentionRate = 25; c.spend = c.rewardAmount = s.operatingCost = 0;
  r = calculateScenario(s); assert.equal(r.totalCost, 0); assert.equal(r.costPerActivated, 0); assert.equal(r.costPerRetained, 0); assert.equal(r.rewardBudgetShare, null);
});

test("token valuation is explicit; zero price is supported; cash ignores token price", () => {
  const s = fixture().scenarios[0], c = s.channels[0];
  c.rewardType = "token"; c.tokenPrice = 0;
  assert.equal(calculateScenario(s).rewardCost, 0);
  c.tokenPrice = 3; assert.equal(calculateScenario(s).rewardCost, 1200);
  c.rewardType = "cash"; assert.equal(calculateScenario(s).rewardCost, 400);
  const m = fixture(); m.scenarios[0].channels[0].rewardType = "token"; m.scenarios[0].channels[0].tokenPrice = 0.000001;
  assert.ok(summaryLines(m, "en").some(line => line.includes("Reward valuation: 0.000001 USD")));
});

test("aggregate rates use counts of differently sized channels, not averaged percentages", () => {
  const s = fixture().scenarios[0];
  s.channels.push({ ...s.channels[0], id: "small", rawParticipants: 100, eligibleParticipants: 100, activationRate: 100, retentionRate: 100 });
  const r = calculateScenario(s);
  assert.equal(r.activated, 500); assert.equal(r.retained, 200); assert.equal(r.activationRate, 500 / 1100); assert.equal(r.retentionRate, 200 / 500);
  assert.equal(r.rewarded, 220); assert.equal(r.rewardCost, 440); assert.equal(r.totalCost, 2540);
});

test("shared cost allocates once with equal, eligible and spend weighting plus zero-weight fallback", () => {
  const s = fixture().scenarios[0];
  s.channels.push({ ...s.channels[0], id: "small", rawParticipants: 3000, eligibleParticipants: 3000, spend: 0 });
  s.allocation = "equal"; assert.deepEqual(allocateOperatingCost(s), [50, 50]);
  s.allocation = "eligible"; assert.deepEqual(allocateOperatingCost(s), [25, 75]);
  s.allocation = "spend"; assert.deepEqual(allocateOperatingCost(s), [100, 0]);
  s.channels[0].spend = 0; assert.deepEqual(allocateOperatingCost(s), [50, 50]);
  s.channels.push({ ...s.channels[0], id: "third" });
  assert.equal(allocateOperatingCost(s).reduce((a, b) => a + b, 0), 100);
  assert.equal(calculateScenario(s).operatingCost, 100);
  s.channels = Array.from({ length: 8 }, (_, i) => ({ ...s.channels[0], id: `c${i}`, spend: i === 7 ? 0 : 1 }));
  const allocated = allocateOperatingCost(s);
  assert.equal(allocated[7], 0);
  assert.equal(allocated.reduce((a, b) => a + b, 0), 100);
  assert.ok(allocated.every(n => n >= 0));
});

test("raw acquisition is excluded from eligible denominators, participant expectations are not rounded", () => {
  const s = fixture().scenarios[0], c = s.channels[0];
  c.rawParticipants = 2000; c.eligibleParticipants = 3; c.activationRate = 50; c.retentionRate = 50;
  const r = calculateScenario(s);
  assert.equal(r.raw, 2000); assert.equal(r.eligible, 3); assert.equal(r.activated, 1.5); assert.equal(r.retained, 0.75); assert.equal(r.activationRate, 0.5);
});

test("observed counts override planned rates; immature retention stays null and mature subtotal uses matching costs", () => {
  const m = fixture(), s = m.scenarios[0], c = s.channels[0];
  s.mode = "observed"; Object.assign(c, { activatedCount: 500, retainedCount: 80, rewardedCount: 30 });
  assert.equal(validateModel(m).ok, true);
  let r = calculateScenario(s);
  assert.equal(r.activated, 500); assert.equal(r.rewarded, 30); assert.equal(r.retained, null); assert.equal(r.retentionRate, null); assert.equal(r.costPerRetained, null); assert.equal(r.mature.channels, 0);
  s.channels.push({ ...c, id: "complete", observationComplete: true });
  r = calculateScenario(s);
  assert.equal(r.retained, null); assert.equal(r.mature.retained, 80); assert.equal(r.mature.totalCost, 1110); assert.equal(r.mature.costPerRetained, 1110 / 80);
  c.observationComplete = true;
  r = calculateScenario(s); assert.equal(r.retained, 160); assert.equal(r.retentionRate, 0.16);
});

test("measurement definitions identify incompatible windows, units and exclusions", () => {
  const a = fixture().scenarios[0], b = structuredClone(a);
  assert.equal(comparable(a, b), true);
  for (const [key, value] of Object.entries({ retentionDays: 60, unit: "addresses", activationEvent: "Other action", retentionEvent: "Different return action", cohortEnd: "2026-12-15", exclusions: "Other exclusions", attribution: "Last touch" })) {
    assert.equal(comparable(a, { ...b, [key]: value }), false, key);
  }
  assert.equal(comparable(a, b, true), false);
});

test("changed reward policies require explicit visitor assumptions; stopped rewards require zero amount", () => {
  const m = fixture(), s = m.scenarios[0];
  s.rewardPolicy = "reduced"; assert.equal(validateModel(m).ok, false);
  s.retentionAssumption = "I assume 20% retention; this is an estimate, not causal evidence.";
  s.channels[0].retentionRate = 20; assert.equal(validateModel(m).ok, true);
  s.rewardPolicy = "stopped"; assert.equal(validateModel(m).ok, false);
  s.channels[0].rewardAmount = 0; assert.equal(validateModel(m).ok, true);
  assert.equal(calculateScenario(s).rewardCost, 0);
});

test("all fictional presets validate in both languages", () => {
  for (const locale of ["en", "de"]) for (const id of ["kol", "developer", "community"]) assert.equal(validateModel(preset(id, locale)).ok, true, `${locale}/${id}`);
});

test("strict schemas reject malformed data, wrong tool, unsupported versions and oversized collections", () => {
  for (const v of [null, [], 7, "x", {}, { ...fixture(), tool: "tokenomics" }, { ...fixture(), schemaVersion: 2 }, { ...fixture(), methodologyVersion: 2 }, { ...fixture(), currency: "BTC" }, { ...fixture(), textOmitted: "yes" }, { ...fixture(), extra: "no" }]) assert.equal(validateModel(v).ok, false);
  const mutations = [
    m => { m.scenarios = []; }, m => { m.scenarios = Array(4).fill(m.scenarios[0]); },
    m => { m.scenarios[0].channels = []; }, m => { m.scenarios[0].channels = Array(9).fill(m.scenarios[0].channels[0]); },
    m => { m.scenarios[0].channels.push(structuredClone(m.scenarios[0].channels[0])); },
    m => { m.scenarios[0].cohortStart = "2026-02-30"; }, m => { m.scenarios[0].cohortEnd = "2020-01-01"; },
    m => { m.scenarios[0].activationEvent = " "; }, m => { m.scenarios[0].retentionDays = 0; },
    m => { m.title = "a".repeat(121); }, m => { m.scenarios[0].assumptions = "a".repeat(1001); },
    m => { m.scenarios[0].evidenceUrl = "javascript:alert(1)"; }, m => { m.scenarios[0].evidenceUrl = "https://user:secret@example.org"; },
    m => { m.scenarios[0].channels[0].observationComplete = "false"; },
    m => { m.scenarios[0].channels[0].rewardType = "nft"; },
  ];
  for (const mutate of mutations) { const m = fixture(); mutate(m); assert.equal(validateModel(m).ok, false, mutate.toString()); }
});

test("numbers are finite, non-negative, bounded, and counts are integers", () => {
  for (const value of [NaN, Infinity, -Infinity, -1, 100.1, "40", null, {}]) {
    const m = fixture(); m.scenarios[0].channels[0].activationRate = value;
    assert.equal(validateModel(m).ok, false);
  }
  const m = fixture(); m.scenarios[0].channels[0].eligibleParticipants = 0.5; assert.equal(validateModel(m).ok, false);
});

test("observed and eligible count relationships are enforced", () => {
  for (const [field, value] of [["eligibleParticipants", 1001], ["activatedCount", 1001], ["retainedCount", 1], ["rewardedCount", 1001]]) {
    const m = fixture(); m.scenarios[0].mode = "observed"; m.scenarios[0].channels[0][field] = value;
    assert.equal(validateModel(m).ok, false, field);
  }
});

test("JSON import rejects malformed JSON, oversize bytes and unknown fields without mutating input", () => {
  assert.equal(parseModel("{broken").ok, false); assert.equal(parseModel(" ".repeat(MAX_JSON_BYTES + 1)).ok, false);
  assert.equal(parseModel(JSON.stringify({ ...fixture(), note: "ö".repeat(MAX_JSON_BYTES / 2) })).ok, false);
  const m = fixture(), before = structuredClone(m); const result = parseModel(JSON.stringify(m));
  assert.equal(result.ok, true); result.model.title = "Changed"; assert.deepEqual(m, before);
});

test("full share round trip preserves all editable data including Unicode", () => {
  const m = preset("community", "de"); m.title = "Grüsse 🌍 <script>safe text</script>";
  assert.deepEqual(decodeShare(encodeShare(m, true)), m);
});

test("default shares exclude every authored string, even names, custom IDs and evidence links", () => {
  const m = fixture(), s = m.scenarios[0];
  m.title = "Secret title"; s.id = "secret_id"; s.evidenceUrl = "https://example.org/private";
  const safe = decodeShare(encodeShare(m));
  assert.deepEqual(safe, shareModel(m, false));
  assert.equal(safe.textOmitted, true); assert.equal(safe.scenarios[0].activationEvent, "");
  assert.equal(JSON.stringify(safe).includes("secret"), false); assert.equal(JSON.stringify(safe).includes("example.org"), false);
  assert.equal(validateModel(safe).ok, true);
  assert.equal(validateModel({ ...safe, textOmitted: false }).ok, false);
});

test("decoder bounds encoded and decoded sizes; rejects wrong versions, bad UTF8 and corrupt payloads", () => {
  for (const hash of ["", "#m=abc", "#w3g=2.abc", `${HASH_PREFIX}%%%`, `${HASH_PREFIX}a`, HASH_PREFIX + "a".repeat(MAX_ENCODED_LENGTH + 1), `${HASH_PREFIX}${btoa(String.fromCharCode(255))}`, `${HASH_PREFIX}${btoa('{}')}`, `${HASH_PREFIX}${Buffer.from(JSON.stringify({ ...fixture(), methodologyVersion: 9 })).toString('base64url')}`]) assert.equal(decodeShare(hash), null);
  const huge = fixture(); huge.scenarios = Array.from({ length: 3 }, (_, i) => ({ ...structuredClone(huge.scenarios[0]), id: `s${i}`, assumptions: "語".repeat(1000), exclusions: "語".repeat(1000), nextExperiment: "語".repeat(1000) }));
  assert.equal(validateModel(huge).ok, true); assert.throws(() => encodeShare(huge, true), /size/);
});

test("maximum channel/scenario default share works and report values match the hand calculation", () => {
  const m = fixture(); const s = m.scenarios[0];
  assert.ok(summaryLines(m, "en").some(l => /USD\s3\.75/.test(l) && /USD\s15\.00/.test(l)));
  assert.ok(summaryLines(m, "de").some(l => l.includes("Kosten / Aktivierung")));
  s.channels = Array.from({ length: 8 }, (_, i) => ({ ...s.channels[0], id: `c${i}` }));
  m.scenarios = Array.from({ length: 3 }, (_, i) => ({ ...structuredClone(s), id: `s${i}` }));
  assert.deepEqual(decodeShare(encodeShare(m)), shareModel(m, false));
});
