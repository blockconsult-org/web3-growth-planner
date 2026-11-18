import type { Channel, Model, Scenario } from "./model";

export interface ChannelResult {
  id: string;
  raw: number;
  eligible: number;
  activated: number;
  retained: number | null;
  rewarded: number;
  spend: number;
  rewardCost: number;
  operatingCost: number;
  totalCost: number;
  costPerActivated: number | null;
  costPerRetained: number | null;
}
export const ratio = (n: number, d: number): number | null => d > 0 ? n / d : null;

/** The final positive-weight channel takes the remainder; zero-weight channels get zero. */
export function allocateOperatingCost(s: Scenario): number[] {
  let weights = s.channels.map(c => s.allocation === "spend" ? c.spend : s.allocation === "eligible" ? c.eligibleParticipants : 1);
  let total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) { weights = weights.map(() => 1); total = weights.length; }
  const final = weights.findLastIndex(weight => weight > 0);
  let allocated = 0;
  return weights.map((weight, i) => {
    if (weight === 0) return 0;
    const remaining = Math.max(0, s.operatingCost - allocated);
    const amount = i === final ? remaining : Math.min(remaining, s.operatingCost * weight / total);
    allocated += amount;
    return amount;
  });
}

function channelResult(c: Channel, s: Scenario, operatingCost: number): ChannelResult {
  const activated = s.mode === "observed" ? c.activatedCount : c.eligibleParticipants * c.activationRate / 100;
  const retained = s.mode === "observed" ? (c.observationComplete ? c.retainedCount : null) : activated * c.retentionRate / 100;
  const rewarded = s.mode === "observed" ? c.rewardedCount : c.eligibleParticipants * c.rewardedShare / 100;
  const rewardCost = rewarded * c.rewardAmount * (c.rewardType === "cash" ? 1 : c.tokenPrice);
  const totalCost = c.spend + rewardCost + operatingCost;
  return { id: c.id, raw: c.rawParticipants, eligible: c.eligibleParticipants, activated, retained, rewarded, spend: c.spend, rewardCost, operatingCost, totalCost, costPerActivated: ratio(totalCost, activated), costPerRetained: retained === null ? null : ratio(totalCost, retained) };
}

export function calculateScenario(s: Scenario) {
  const allocations = allocateOperatingCost(s);
  const channels = s.channels.map((c, i) => channelResult(c, s, allocations[i]));
  const sum = (rows: ChannelResult[], key: "raw" | "eligible" | "activated" | "rewarded" | "spend" | "rewardCost" | "operatingCost" | "totalCost") => rows.reduce((total, c) => total + c[key], 0);
  const raw = sum(channels, "raw"), eligible = sum(channels, "eligible"), activated = sum(channels, "activated"), rewarded = sum(channels, "rewarded");
  const totalCost = sum(channels, "totalCost"), rewardCost = sum(channels, "rewardCost");
  const complete = channels.every(c => c.retained !== null);
  const retained = complete ? channels.reduce((n, c) => n + (c.retained ?? 0), 0) : null;
  const mature = channels.filter(c => c.retained !== null);
  const matureRetained = mature.reduce((n, c) => n + (c.retained ?? 0), 0);
  return {
    channels, raw, eligible, activated, retained, rewarded, totalCost, rewardCost,
    spend: sum(channels, "spend"), operatingCost: sum(channels, "operatingCost"), complete,
    activationRate: ratio(activated, eligible), retentionRate: retained === null ? null : ratio(retained, activated),
    costPerActivated: ratio(totalCost, activated), costPerRetained: retained === null ? null : ratio(totalCost, retained),
    rewardBudgetShare: ratio(rewardCost, totalCost), rewardedShare: ratio(rewarded, eligible),
    mature: { channels: mature.length, activated: sum(mature, "activated"), retained: matureRetained, totalCost: sum(mature, "totalCost"), costPerRetained: ratio(sum(mature, "totalCost"), matureRetained) },
  };
}
export type ScenarioResult = ReturnType<typeof calculateScenario>;

/** No cross-scenario totals. Compare outcomes only with an identical measurement definition. */
export function comparable(a: Scenario, b: Scenario, textOmitted = false): boolean {
  if (textOmitted) return false;
  const fields = ["unit", "activationEvent", "retentionEvent", "cohortStart", "cohortEnd", "retentionDays", "exclusions", "attribution"] as const;
  return fields.every(k => a[k] === b[k]);
}
export function calculateModel(model: Model) { return model.scenarios.map(calculateScenario); }
