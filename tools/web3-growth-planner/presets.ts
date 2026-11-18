import { TOOL_ID, SCHEMA_VERSION, METHODOLOGY_VERSION, type Channel, type Locale, type Model, type Scenario } from "./model";
export type PresetId = "kol" | "developer" | "community";

export function newChannel(id: string, name: string): Channel {
  return { id, name, spend: 0, rawParticipants: 0, eligibleParticipants: 0, activationRate: 0, retentionRate: 0, rewardedShare: 0, activatedCount: 0, retainedCount: 0, rewardedCount: 0, observationComplete: false, rewardType: "cash", rewardAmount: 0, tokenPrice: 0 };
}

export function preset(id: PresetId, locale: Locale): Model {
  const de = locale === "de";
  const channel = (cid: string, name: string, spend: number, raw: number, eligible: number, activation: number, retention: number, share: number, reward: number, tokenPrice?: number): Channel => ({
    ...newChannel(cid, name), spend, rawParticipants: raw, eligibleParticipants: eligible, activationRate: activation, retentionRate: retention, rewardedShare: share, rewardAmount: reward, rewardType: tokenPrice === undefined ? "cash" : "token", tokenPrice: tokenPrice ?? 0,
  });
  const s: Scenario = {
    id: "baseline", name: de ? "Ausgangsplan" : "Baseline plan", mode: "planned", rewardPolicy: "standard", retentionAssumption: "",
    activationEvent: de ? "Ein berechtigtes Konto schliesst seinen ersten Produkttausch ab." : "An eligible account completes its first product swap.",
    unit: "accounts", cohortStart: "2026-12-01", cohortEnd: "2026-12-14", retentionDays: 30,
    retentionEvent: de ? "Mindestens ein weiterer Produkttausch an Tag 8–30 nach Aktivierung." : "At least one further product swap on days 8–30 after activation.",
    exclusions: de ? "Bots, interne Tests und doppelte Konten vor der Zuordnung ausschliessen." : "Exclude bots, internal tests and duplicate accounts before attribution.",
    attribution: de ? "Erster qualifizierter Kontakt im Akquisefenster; pro Konto genau ein Kanal." : "First qualified touch in the acquisition window; exactly one channel per account.",
    assumptions: de ? "Fiktive Planung. Prämien werden einmal pro berechtigtem, prämiertem Konto gezahlt. Keine Preisprognose." : "Fictional plan. Rewards are paid once per eligible rewarded account. No price forecast.",
    nextExperiment: de ? "Kleine Pilotkohorte mit dokumentierter Zuordnung starten und nach dem vollen Bindungsfenster erneut messen." : "Run a small pilot cohort with documented attribution and measure again after the full retention window.",
    evidenceUrl: "", operatingCost: 300, allocation: "eligible", channels: [],
  };
  let title: string;
  if (id === "kol") {
    title = de ? "Fiktive KOL-Kampagne" : "Fictional KOL campaign";
    s.channels = [channel("creator", de ? "KOL-Produktdemo" : "KOL product demo", 1000, 1200, 1000, 40, 25, 20, 2), channel("newsletter", de ? "Partnernewsletter" : "Partner newsletter", 500, 400, 300, 50, 40, 10, 2)];
  } else if (id === "developer") {
    title = de ? "Fiktive Entwickleraktivierung" : "Fictional developer activation";
    s.unit = "authenticatedUsers";
    s.activationEvent = de ? "Ein authentifizierter Entwickler veröffentlicht einen erfolgreichen Testnet-Aufruf aus einer eigenen Anwendung." : "An authenticated developer ships a successful testnet call from their own application.";
    s.retentionEvent = de ? "Die Anwendung führt an mindestens zwei Tagen zwischen Tag 15 und 30 API-Aufrufe aus." : "The application makes API calls on at least two days between days 15 and 30.";
    s.attribution = de ? "Erster Workshop oder erste Dokumentationsquelle; pro authentifiziertem Nutzer ein Kanal." : "First workshop or documentation source; one channel per authenticated user.";
    s.assumptions = de ? "Fiktive Planung. Einmalige Zuschüsse pro prämiertem Entwickler; keine wiederkehrenden Zahlungen." : "Fictional plan. One-time grants per rewarded developer; no recurring payments.";
    s.operatingCost = 1200;
    s.channels = [channel("workshop", de ? "Technischer Workshop" : "Technical workshop", 1800, 140, 120, 65, 55, 15, 50), channel("docs", de ? "Dokumentation & Tutorials" : "Documentation & tutorials", 900, 360, 300, 30, 60, 0, 0)];
  } else {
    title = de ? "Fiktives Community-Onboarding" : "Fictional community onboarding";
    s.unit = "addresses";
    s.activationEvent = de ? "Eine berechtigte Adresse schliesst die Onboarding-Quest und eine Produktaktion ab." : "An eligible address completes the onboarding quest and one product action.";
    s.retentionEvent = de ? "Dieselbe Adresse führt zwischen Tag 15 und 30 eine weitere Produktaktion aus." : "The same address performs another product action between days 15 and 30.";
    s.attribution = de ? "Erster Empfehlungslink oder Community-Termin, dedupliziert nach Adresse. Eine Adresse ist keine Person." : "First referral link or community session, de-duplicated by address. An address is not a person.";
    s.assumptions = de ? "Fiktive Planung. Tokenbewertung manuell auf 0,25 gesetzt; keine Marktdaten. Adressen sind keine Personen." : "Fictional plan. Token valuation manually set to 0.25; no market data. Addresses are not people.";
    s.operatingCost = 600;
    s.channels = [channel("referral", de ? "Community-Empfehlungen" : "Community referrals", 600, 2100, 1500, 35, 20, 60, 8, 0.25), channel("session", de ? "Begleitetes Onboarding" : "Guided onboarding", 400, 450, 400, 70, 45, 50, 4, 0.25)];
  }
  return { tool: TOOL_ID, schemaVersion: SCHEMA_VERSION, methodologyVersion: METHODOLOGY_VERSION, textOmitted: false, title, currency: "USD", scenarios: [s] };
}
