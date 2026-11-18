import { calculateScenario } from "./calculate";
import { copy, formatters, scenarioName } from "./copy";
import type { Locale, Model } from "./model";

/** Shared report content keeps PNG output tied to the same arithmetic as the UI. */
export function summaryLines(model: Model, locale: Locale): string[] {
  const t = copy(locale), f = formatters(locale, model.currency);
  const lines = [t.title, model.title || t.campaign, t.methodologyVersion];
  if (model.textOmitted) lines.push(t.omittedNote);
  model.scenarios.forEach((s, i) => {
    const r = calculateScenario(s);
    lines.push("", `${i + 1}. ${scenarioName(s, i, t)} · ${t[s.mode]} · ${t[s.rewardPolicy]}`,
      `${t.totalCost}: ${f.money(r.totalCost)} | ${t.activated}: ${f.count(r.activated)} | ${t.retained}: ${r.complete ? f.count(r.retained) : t.pending}`,
      `${t.costPerActivated}: ${f.money(r.costPerActivated)} | ${t.costPerRetained}: ${f.money(r.costPerRetained)}`,
      `${t.raw}: ${f.count(r.raw)} | ${t.eligibleCount}: ${f.count(r.eligible)} | ${t.rewarded}: ${f.count(r.rewarded)}`,
      `${t.activationRate.replace(" (%)", "")}: ${f.percent(r.activationRate)} | ${t.retentionRate.replace(" (%)", "")}: ${f.percent(r.retentionRate)}`,
      `${t.acquisition}: ${f.money(r.spend)} | ${t.rewardCost}: ${f.money(r.rewardCost)} | ${t.operating}: ${f.money(r.operatingCost)}`,
      `${t.dependency}: ${f.percent(r.rewardBudgetShare)} ${t.rewardBudgetShare}; ${f.percent(r.rewardedShare)} ${t.participantsRewarded}`);
    s.channels.forEach((c, ci) => {
      const cr = r.channels[ci];
      lines.push(`${c.name || `${t.channel} ${ci + 1}`}: ${f.money(cr.totalCost)} (${t.acquisition} ${f.money(cr.spend)} / ${t.rewardCost} ${f.money(cr.rewardCost)} / ${t.operating} ${f.money(cr.operatingCost)}); ${t.activated} ${f.count(cr.activated)}; ${t.retained} ${cr.retained === null ? t.pending : f.count(cr.retained)}`);
      lines.push(`${t.rewardAmount}: ${f.decimal(c.rewardAmount)} ${c.rewardType === "cash" ? model.currency : t.token}; ${t.rewardValuation}: ${c.rewardType === "cash" ? "1" : `${f.decimal(c.tokenPrice)} ${model.currency}`}`);
    });
    if (!r.complete) lines.push(`${t.mature}: ${r.mature.channels}/${s.channels.length}; ${t.retained} ${f.count(r.mature.retained)}; ${t.costPerRetained} ${f.money(r.mature.costPerRetained)}`, t.matureNote);
    lines.push(`${t.countUnit}: ${t[s.unit]}`, `${t.cohortStart}: ${s.cohortStart} → ${s.cohortEnd}`, `${t.observationWindow}: ${s.retentionDays} ${t.days}`, `${t.allocationRule}: ${t[s.allocation]}`);
    for (const key of ["activationEvent", "retentionEvent", "exclusions", "attribution", "retentionAssumption", "assumptions", "nextExperiment"] as const) {
      if (key === "retentionAssumption" && s.rewardPolicy === "standard") continue;
      lines.push(`${t[key]}: ${s[key] || (model.textOmitted ? t.omitted : t.empty)}`);
    }
    if (s.evidenceUrl) lines.push(`${t.evidenceUrl}: ${s.evidenceUrl}`);
    lines.push(s.mode === "planned" ? t.plannedNote : t.observedNote);
  });
  lines.push("", t.rewardNote, t.allocationNote, t.rounded, t.endReport);
  return lines;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function summaryPng(model: Model, locale: Locale): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1440;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const t = copy(locale);
  const family = getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
  type Line = { text: string; y: number; font: string; color: string };
  const lines: Line[] = [], dividers: number[] = [];
  let y = 76;
  const paragraphs = summaryLines(model, locale);
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (!paragraph) { y += 20; continue; }
    const section = /^\d\. /.test(paragraph);
    const headline = i === 0;
    const metric = paragraph.startsWith(`${t.totalCost}:`) || paragraph.startsWith(`${t.costPerActivated}:`);
    const font = `${headline ? "550 44" : section ? "550 30" : i === 1 ? "400 26" : metric ? "550 24" : "400 22"}px ${family}`;
    const lineHeight = headline ? 53 : section ? 40 : 34;
    const color = i === 2 || i > paragraphs.length - 5 ? "#4d535c" : "#0b0d10";
    if (section) { dividers.push(y); y += 26; }
    ctx.font = font;
    for (const part of paragraph.split("\n")) {
      let line = "";
      const push = () => { lines.push({ text: line, y, font, color }); y += lineHeight; line = ""; };
      for (const word of part.split(/\s+/)) {
        if (ctx.measureText(word).width > 1280) {
          if (line) push();
          for (const char of word) { if (ctx.measureText(line + char).width > 1280) push(); line += char; }
        } else if (line && ctx.measureText(`${line} ${word}`).width > 1280) { push(); line = word; }
        else line = line ? `${line} ${word}` : word;
      }
      if (line) push();
    }
    y += headline || section ? 18 : 10;
  }
  canvas.height = Math.ceil(y + 64);
  if (canvas.height > 30_000) throw new Error("size");
  ctx.fillStyle = "#f7f8fa"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#2867c4"; ctx.fillRect(0, 0, canvas.width, 8);
  ctx.fillStyle = "#d4d7dc"; dividers.forEach(top => ctx.fillRect(80, top, 1280, 1));
  ctx.textBaseline = "top";
  for (const line of lines) { ctx.font = line.font; ctx.fillStyle = line.color; ctx.fillText(line.text, 80, line.y); }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("png")), "image/png"));
}
