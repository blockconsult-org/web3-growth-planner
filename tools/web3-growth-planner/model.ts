export const TOOL_ID = "web3-growth-planner" as const;
export const SCHEMA_VERSION = 1 as const;
export const METHODOLOGY_VERSION = 1 as const;
export const MAX_JSON_BYTES = 96_000;
export const STORAGE_KEY = "blockconsult:web3-growth-planner:v1";
export type Locale = "en" | "de";
export type Currency = "USD" | "EUR" | "CHF";
export type Unit = "accounts" | "addresses" | "authenticatedUsers";
export type Allocation = "equal" | "eligible" | "spend";
export type Mode = "planned" | "observed";
export type RewardPolicy = "standard" | "reduced" | "stopped";

export interface Channel {
  id: string;
  name: string;
  spend: number;
  rawParticipants: number;
  eligibleParticipants: number;
  activationRate: number;
  retentionRate: number;
  rewardedShare: number;
  activatedCount: number;
  retainedCount: number;
  rewardedCount: number;
  observationComplete: boolean;
  rewardType: "cash" | "token";
  rewardAmount: number;
  tokenPrice: number;
}

export interface Scenario {
  id: string;
  name: string;
  mode: Mode;
  rewardPolicy: RewardPolicy;
  retentionAssumption: string;
  activationEvent: string;
  unit: Unit;
  cohortStart: string;
  cohortEnd: string;
  retentionDays: number;
  retentionEvent: string;
  exclusions: string;
  attribution: string;
  assumptions: string;
  nextExperiment: string;
  evidenceUrl: string;
  operatingCost: number;
  allocation: Allocation;
  channels: Channel[];
}

export interface Model {
  tool: typeof TOOL_ID;
  schemaVersion: typeof SCHEMA_VERSION;
  methodologyVersion: typeof METHODOLOGY_VERSION;
  textOmitted: boolean;
  title: string;
  currency: Currency;
  scenarios: Scenario[];
}

export type IssueCode = "shape" | "version" | "required" | "text" | "number" | "integer" | "enum" | "size" | "date" | "order" | "eligible" | "activated" | "retained" | "rewarded" | "stopped" | "url" | "duplicate";
export interface Issue { path: string; code: IssueCode }
export type Validation = { ok: true; model: Model } | { ok: false; issues: Issue[] };

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const dateValid = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;

/** Strict whitelist validation. Nothing from an import is merged into a live model. */
export function validateModel(value: unknown): Validation {
  const issues: Issue[] = [];
  const add = (path: string, code: IssueCode) => issues.push({ path, code });
  if (!record(value)) return { ok: false, issues: [{ path: "model", code: "shape" }] };
  if (value.tool !== TOOL_ID || value.schemaVersion !== SCHEMA_VERSION || value.methodologyVersion !== METHODOLOGY_VERSION) {
    return { ok: false, issues: [{ path: "model", code: "version" }] };
  }
  const textOmitted = value.textOmitted === true;
  function keys(obj: Record<string, unknown>, allowed: string[], path: string) {
    if (Object.keys(obj).some(k => !allowed.includes(k))) add(path, "shape");
  }
  function str(obj: Record<string, unknown>, key: string, path: string, max: number, required = false) {
    const v = obj[key];
    if (typeof v !== "string" || v.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) add(`${path}.${key}`, "text");
    else if (required && !textOmitted && !v.trim()) add(`${path}.${key}`, "required");
  }
  function num(obj: Record<string, unknown>, key: string, path: string, max: number, integer = false, min = 0) {
    const v = obj[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) add(`${path}.${key}`, "number");
    else if (integer && !Number.isInteger(v)) add(`${path}.${key}`, "integer");
  }
  function en(obj: Record<string, unknown>, key: string, path: string, options: readonly unknown[]) {
    if (!options.includes(obj[key])) add(`${path}.${key}`, "enum");
  }
  function id(obj: Record<string, unknown>, path: string, ids: Set<string>) {
    const v = obj.id;
    if (typeof v !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(v)) add(`${path}.id`, "text");
    else if (ids.has(v)) add(`${path}.id`, "duplicate");
    else ids.add(v);
  }
  keys(value, ["tool", "schemaVersion", "methodologyVersion", "textOmitted", "title", "currency", "scenarios"], "model");
  en(value, "textOmitted", "model", [true, false]);
  str(value, "title", "model", 120);
  en(value, "currency", "model", ["USD", "EUR", "CHF"]);
  if (!Array.isArray(value.scenarios) || value.scenarios.length < 1 || value.scenarios.length > 3) add("scenarios", "size");
  else {
    const ids = new Set<string>();
    value.scenarios.forEach((s: unknown, si) => {
      const p = `scenarios.${si}`;
      if (!record(s)) { add(p, "shape"); return; }
      keys(s, ["id", "name", "mode", "rewardPolicy", "retentionAssumption", "activationEvent", "unit", "cohortStart", "cohortEnd", "retentionDays", "retentionEvent", "exclusions", "attribution", "assumptions", "nextExperiment", "evidenceUrl", "operatingCost", "allocation", "channels"], p);
      id(s, p, ids);
      str(s, "name", p, 80);
      for (const key of ["activationEvent", "retentionEvent", "attribution"]) str(s, key, p, 500, true);
      str(s, "retentionAssumption", p, 500, s.rewardPolicy !== "standard");
      for (const key of ["exclusions", "assumptions", "nextExperiment"]) str(s, key, p, 1000);
      str(s, "evidenceUrl", p, 500);
      if (typeof s.evidenceUrl === "string" && s.evidenceUrl) {
        try { const u = new URL(s.evidenceUrl); if (!["https:", "http:"].includes(u.protocol) || u.username || u.password) add(`${p}.evidenceUrl`, "url"); }
        catch { add(`${p}.evidenceUrl`, "url"); }
      }
      en(s, "mode", p, ["planned", "observed"]);
      en(s, "rewardPolicy", p, ["standard", "reduced", "stopped"]);
      en(s, "unit", p, ["accounts", "addresses", "authenticatedUsers"]);
      en(s, "allocation", p, ["equal", "eligible", "spend"]);
      for (const key of ["cohortStart", "cohortEnd"]) if (!dateValid(s[key])) add(`${p}.${key}`, "date");
      if (dateValid(s.cohortStart) && dateValid(s.cohortEnd) && s.cohortEnd < s.cohortStart) add(`${p}.cohortEnd`, "order");
      num(s, "retentionDays", p, 730, true, 1);
      num(s, "operatingCost", p, 1_000_000_000);
      if (!Array.isArray(s.channels) || s.channels.length < 1 || s.channels.length > 8) { add(`${p}.channels`, "size"); return; }
      const channelIds = new Set<string>();
      s.channels.forEach((c: unknown, ci) => {
        const q = `${p}.channels.${ci}`;
        if (!record(c)) { add(q, "shape"); return; }
        keys(c, ["id", "name", "spend", "rawParticipants", "eligibleParticipants", "activationRate", "retentionRate", "rewardedShare", "activatedCount", "retainedCount", "rewardedCount", "observationComplete", "rewardType", "rewardAmount", "tokenPrice"], q);
        id(c, q, channelIds);
        str(c, "name", q, 80);
        for (const key of ["spend", "rewardAmount", "tokenPrice"]) num(c, key, q, key === "spend" ? 1_000_000_000 : 1_000_000);
        for (const key of ["rawParticipants", "eligibleParticipants", "activatedCount", "retainedCount", "rewardedCount"]) num(c, key, q, 100_000_000, true);
        for (const key of ["activationRate", "retentionRate", "rewardedShare"]) num(c, key, q, 100);
        en(c, "observationComplete", q, [true, false]);
        en(c, "rewardType", q, ["cash", "token"]);
        if (typeof c.eligibleParticipants === "number" && typeof c.rawParticipants === "number" && c.eligibleParticipants > c.rawParticipants) add(`${q}.eligibleParticipants`, "eligible");
        if (s.mode === "observed") {
          if (Number(c.activatedCount) > Number(c.eligibleParticipants)) add(`${q}.activatedCount`, "activated");
          if (Number(c.retainedCount) > Number(c.activatedCount)) add(`${q}.retainedCount`, "retained");
          if (Number(c.rewardedCount) > Number(c.eligibleParticipants)) add(`${q}.rewardedCount`, "rewarded");
        }
        if (s.rewardPolicy === "stopped" && c.rewardAmount !== 0) add(`${q}.rewardAmount`, "stopped");
      });
    });
  }
  return issues.length ? { ok: false, issues } : { ok: true, model: structuredClone(value) as unknown as Model };
}

export function parseModel(text: string): Validation {
  if (text.length > MAX_JSON_BYTES || new TextEncoder().encode(text).length > MAX_JSON_BYTES) return { ok: false, issues: [{ path: "model", code: "size" }] };
  try { return validateModel(JSON.parse(text)); }
  catch { return { ok: false, issues: [{ path: "model", code: "shape" }] }; }
}
