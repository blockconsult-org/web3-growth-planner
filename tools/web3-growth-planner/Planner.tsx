"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { localeHref } from "@/content/i18n";
import { decodeShare, encodeShare, shareModel } from "./codec";
import { copy, issueText, scenarioName } from "./copy";
import { MAX_JSON_BYTES, STORAGE_KEY, parseModel, validateModel, type Channel, type Issue, type Locale, type Model, type Scenario } from "./model";
import { newChannel, preset, type PresetId } from "./presets";
import { downloadBlob, summaryPng } from "./report";
import { Comparison, MeasurementReport, PrintReport, ScenarioResults } from "./Results";
import { Select } from "./Select";
import { ActionMenu } from "./ActionMenu";
import styles from "./planner.module.css";

const PATH = "/tools/web3-growth-planner";
const TRANSFER_KEY = `${STORAGE_KEY}:language`;
const fieldId = (path: string) => `growth-${path.replaceAll(".", "-")}`;

function Input({ path, label, value, onChange, disabled, issues, locale, max = 1000, numeric, integer, min = 0, type = "text", multiline = false }: {
  path: string; label: string; value: string | number; onChange: (value: string) => void; disabled: boolean; issues: Issue[]; locale: Locale; max?: number; numeric?: boolean; integer?: boolean; min?: number; type?: string; multiline?: boolean;
}) {
  const id = fieldId(path), issue = issues.find(i => i.path === path);
  const props = { id, value: typeof value === "number" && !Number.isFinite(value) ? "" : value, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value), disabled, "aria-invalid": Boolean(issue), "aria-describedby": issue ? `${id}-error` : undefined };
  return <div className={styles.field}><label htmlFor={id}>{label}</label>
    {multiline ? <textarea {...props} rows={3} maxLength={max} /> : <input {...props} type={numeric ? "number" : type} {...(numeric ? { min, max, step: integer ? 1 : "any", inputMode: integer ? "numeric" as const : "decimal" as const } : { maxLength: max })} />}
    {issue && <span className={styles.error} id={`${id}-error`}>{issueText(issue, locale)}{numeric && <> {copy(locale).range}: {min.toLocaleString(locale)}–{max.toLocaleString(locale)}.</>}</span>}
  </div>;
}

export default function Planner({ locale }: { locale: Locale }) {
  const router = useRouter();
  const t = copy(locale);
  const [draft, setDraft] = useState<Model>(() => preset("kol", locale));
  const [snapshot, setSnapshot] = useState<Model | null>(null);
  const [selected, setSelected] = useState(0);
  const [presetId, setPresetId] = useState<PresetId>("kol");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [includeText, setIncludeText] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"inputs" | "results">("inputs");
  const viewNavRef = useRef<HTMLElement>(null);
  const routerHistoryState = useRef<unknown>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const shareRef = useRef<HTMLElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const model = snapshot ?? draft;
  const readOnly = snapshot !== null;
  const validation = validateModel(model);
  const issues = validation.ok ? [] : validation.issues;
  const valid = validation.ok;
  const index = Math.min(selected, model.scenarios.length - 1);
  const s = model.scenarios[index];
  const sp = `scenarios.${index}`;
  const disabled = readOnly || !ready;

  useEffect(() => {
    // Native fragment navigation can create an entry with a null state. Keep
    // the current route state so removing a scenario never remounts the tool.
    routerHistoryState.current = window.history.state;
    function syncHash() {
      const hash = window.location.hash;
      setSharing(false); setShareLink(""); setSelected(0);
      if (!hash || hash === "#main") { setSnapshot(null); return; }
      const incoming = decodeShare(hash);
      setSnapshot(incoming);
      if (incoming) setView("results");
      setNotice(incoming ? "" : t.invalidLink);
    }
    const frame = requestAnimationFrame(() => {
      syncHash();
      const url = new URL(window.location.href);
      if (url.searchParams.get("growth-language") === "1") {
        try {
          const raw = sessionStorage.getItem(TRANSFER_KEY);
          sessionStorage.removeItem(TRANSFER_KEY);
          if (raw && raw.length < MAX_JSON_BYTES + 100) {
            const transfer = JSON.parse(raw);
            const checked = validateModel(transfer.model);
            if (checked.ok) {
              if (transfer.readOnly === true) setSnapshot(checked.model);
              else { setDraft(checked.model); setSnapshot(null); }
              if (transfer.view === "inputs" || transfer.view === "results") setView(transfer.view);
              if (Number.isInteger(transfer.selected) && transfer.selected >= 0 && transfer.selected < checked.model.scenarios.length) setSelected(transfer.selected);
              if (["kol", "developer", "community"].includes(transfer.presetId)) setPresetId(transfer.presetId);
            } else setNotice(t.invalidImport);
          }
        } catch { setNotice(t.storageError); }
        url.searchParams.delete("growth-language");
        window.history.replaceState(window.history.state ?? routerHistoryState.current, "", url);
      }
      setReady(true);
    });
    window.addEventListener("hashchange", syncHash);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", syncHash); };
  }, [t.invalidLink, t.invalidImport, t.storageError]);

  // A scenario fragment is local state; preserve the router history entry.
  function clearHash() { const url = new URL(window.location.href); url.hash = ""; window.history.replaceState(window.history.state ?? routerHistoryState.current, "", url); }
  function dismissShare() { setSharing(false); setShareLink(""); }
  function change(next: Model) { if (disabled) return; setDraft(next); dismissShare(); setNotice(""); }
  function scenarioChange(patch: Partial<Scenario>) { change({ ...draft, scenarios: draft.scenarios.map((item, i) => i === index ? { ...item, ...patch } : item) }); }
  function focusChannel(ci: number, edit = true) {
    requestAnimationFrame(() => {
      const node = document.getElementById(fieldId(`${sp}.channels.${ci}.name`));
      const details = node?.closest("details");
      if (edit && details) details.open = true;
      (edit ? node : details?.querySelector("summary"))?.focus();
    });
  }
  function channelChange(ci: number, patch: Partial<Channel>) { scenarioChange({ channels: s.channels.map((c, i) => i === ci ? { ...c, ...patch } : c) }); }
  function loadPreset() { if (disabled) return; change(preset(presetId, locale)); setSelected(0); }
  function textField(key: "activationEvent" | "retentionEvent" | "attribution" | "exclusions" | "assumptions" | "nextExperiment" | "evidenceUrl" | "retentionAssumption" | "name" | "cohortStart" | "cohortEnd") {
    const max = key === "name" ? 80 : ["exclusions", "assumptions", "nextExperiment"].includes(key) ? 1000 : 500;
    return <Input key={key} path={`${sp}.${key}`} label={t[key]} value={s[key]} onChange={value => scenarioChange({ [key]: value })} disabled={disabled} issues={issues} locale={locale} max={max} multiline={!["name", "cohortStart", "cohortEnd", "evidenceUrl"].includes(key)} type={key.startsWith("cohort") ? "date" : "text"} />;
  }
  function numberField(key: "operatingCost" | "retentionDays", max: number, integer = false) {
    return <Input path={`${sp}.${key}`} label={t[key]} value={s[key]} onChange={v => scenarioChange({ [key]: v.trim() === "" ? NaN : Number(v) })} disabled={disabled} issues={issues} locale={locale} max={max} min={key === "retentionDays" ? 1 : 0} numeric integer={integer} />;
  }
  function localSave() {
    if (!valid || readOnly) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(model)); setNotice(t.saved); }
    catch { setNotice(t.storageError); }
  }
  function localLoad() {
    if (readOnly) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { setNotice(t.emptySave); return; }
      const parsed = parseModel(raw);
      if (!parsed.ok) { setNotice(t.invalidImport); return; }
      if (parsed.model.textOmitted) { setSnapshot(parsed.model); setView("results"); }
      else setDraft(parsed.model);
      setSelected(0); dismissShare(); clearHash(); setNotice(t.loaded);
    } catch { setNotice(t.storageError); }
  }
  function localDelete() { try { localStorage.removeItem(STORAGE_KEY); setNotice(t.deleted); } catch { setNotice(t.storageError); } }
  function exportJson() { if (valid) downloadBlob(new Blob([JSON.stringify(model, null, 2)], { type: "application/json" }), `web3-growth-planner-${locale}.json`); }
  async function importJson(file: File | undefined) {
    if (!file || readOnly) return;
    if (file.size > MAX_JSON_BYTES) { setNotice(t.invalidImport); return; }
    try {
      const parsed = parseModel(await file.text());
      if (!parsed.ok) { setNotice(t.invalidImport); return; }
      if (parsed.model.textOmitted) { setSnapshot(parsed.model); setView("results"); }
      else setDraft(parsed.model);
      setSelected(0); clearHash(); dismissShare(); setNotice(t.imported);
    } catch { setNotice(t.invalidImport); }
  }
  function makeCopy() {
    if (!snapshot) return;
    setDraft({ ...structuredClone(snapshot), textOmitted: false }); setSnapshot(null); setView("inputs"); clearHash(); dismissShare(); setNotice(t.copiedDraft);
    requestAnimationFrame(() => document.getElementById("growth-inputs-heading")?.focus());
  }
  function createLink() {
    try { setShareLink(`${"https://www.blockconsult.org"}${localeHref(locale, PATH)}${encodeShare(model, includeText)}`); setNotice(""); }
    catch { setNotice(t.tooLarge); setShareLink(""); }
  }
  async function copyLink() { try { await navigator.clipboard.writeText(shareLink); setNotice(t.copied); } catch { setNotice(t.copyFallback); } }
  async function png() {
    if (!valid) return;
    setBusy(true);
    try { downloadBlob(await summaryPng(model, locale), `web3-growth-planner-${locale}.png`); }
    catch { setNotice(t.downloadError); }
    finally { setBusy(false); }
  }
  function showView(next: "inputs" | "results") {
    const moveFocus = !viewNavRef.current?.contains(document.activeElement);
    setView(next);
    requestAnimationFrame(() => {
      if (moveFocus) viewNavRef.current?.querySelector<HTMLButtonElement>(`[aria-controls="growth-${next}"]`)?.focus({ preventScroll: true });
      viewNavRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  function switchLanguage() {
    if (!valid) return;
    const path = localeHref(locale === "en" ? "de" : "en", PATH);
    try {
      sessionStorage.setItem(TRANSFER_KEY, JSON.stringify({ model, readOnly, selected: index, presetId, view }));
      router.push(`${path}?growth-language=1`);
    } catch {
      try { router.push(`${path}${encodeShare(model, true)}`); }
      catch { setNotice(t.tooLarge); }
    }
  }

  return <div data-growth-planner className={styles.planner}>
    <div className={styles.screenOnly}>
      <div className={styles.toolbar} aria-label={t.workspace}>
        <div className={styles.startingPoint}>
          <Select id="growth-preset" label={t.preset} value={presetId} disabled={disabled} options={(["kol", "developer", "community"] as const).map(value => ({ value, label: t[value] }))} onChange={setPresetId} />
          <button disabled={disabled} onClick={loadPreset}>{t.apply}</button>
        </div>
        <div className={styles.toolbarGroup}>
          <button disabled={disabled || !valid} onClick={localSave}>{t.save}</button>
          <ActionMenu label={t.files} note={t.jsonNote} actions={[
            { label: t.load, disabled, onClick: localLoad },
            { label: t.import, disabled, onClick: () => fileRef.current?.click() },
            { label: t.export, disabled: !ready || !valid, onClick: exportJson },
            { label: t.reset, disabled, onClick: loadPreset },
            { label: t.delete, disabled, destructive: true, onClick: localDelete },
          ]} />
          <button ref={shareButtonRef} className={styles.primary} disabled={!ready || !valid} onClick={() => { setSharing(true); setIncludeText(false); setShareLink(""); requestAnimationFrame(() => shareRef.current?.focus()); }}>{t.share} <span aria-hidden="true">↗</span></button>
        </div>
        <input ref={fileRef} className={styles.fileInput} type="file" accept=".json,application/json" tabIndex={-1} aria-label={t.import} onChange={e => { void importJson(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <p className={styles.noticeText} role="status" aria-live="polite">{notice}</p>
      {readOnly && <section className={styles.notice}><h2>{t.snapshot}</h2><p>{t.snapshotNote}</p><div className={styles.actions}><button className={styles.primary} onClick={makeCopy}>{t.makeCopy}</button><button onClick={() => { setSnapshot(null); setView("inputs"); clearHash(); setSelected(0); dismissShare(); setNotice(""); requestAnimationFrame(() => document.getElementById("growth-inputs-heading")?.focus()); }}>{t.back}</button></div></section>}
      {model.textOmitted && <p className={styles.notice}>{t.omittedNote}</p>}

      {sharing && <section ref={shareRef} tabIndex={-1} className={styles.sharePanel} aria-labelledby="share-title" onKeyDown={e => { if (e.key === "Escape") { dismissShare(); shareButtonRef.current?.focus(); } }}>
        <div className={styles.headingRow}><h2 id="share-title">{t.shareTitle}</h2><button onClick={() => { dismissShare(); shareButtonRef.current?.focus(); }}>{t.close}</button></div>
        <p>{t.shareIntro}</p><p>{t.shareCount}: {model.scenarios.length} · {t.currency}: {model.currency}</p>
        <label className={styles.check}><input type="checkbox" checked={includeText} onChange={e => { setIncludeText(e.target.checked); setShareLink(""); }} />{t.includeText}</label>
        <p className={styles.hint}>{includeText ? t.textIncluded : t.textExcluded}</p>
        <details><summary>{t.shareTitle} · JSON</summary><pre className={styles.preview}>{JSON.stringify(shareModel(model, includeText), null, 2)}</pre></details>
        <button className={styles.primary} onClick={createLink}>{t.createLink}</button>
        {shareLink && <div className={styles.field}><label htmlFor="growth-share-link">{t.linkLabel}</label><textarea id="growth-share-link" readOnly rows={3} value={shareLink} onFocus={e => e.target.select()} /><button onClick={() => void copyLink()}>{t.copyLink}</button></div>}
      </section>}

      {!valid && <section role="alert" className={styles.notice}><h2>{t.validationTitle}</h2><p>{t.invalidResults}</p><ul>{issues.map(issue => <li key={`${issue.path}-${issue.code}`}><button className={styles.errorLink} onClick={() => {
        const parts = issue.path.split(".");
        setView("inputs");
        if (parts[0] === "scenarios") setSelected(Number(parts[1]));
        requestAnimationFrame(() => {
          const node = document.getElementById(fieldId(issue.path));
          let parent = node?.parentElement;
          while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
          node?.focus();
        });
      }}>{issueText(issue, locale)}</button></li>)}</ul></section>}

      <nav ref={viewNavRef} className={styles.viewNav} aria-label={t.views}>
        <button aria-pressed={view === "inputs"} aria-controls="growth-inputs" onClick={() => showView("inputs")}>{t.inputs}</button>
        <button aria-pressed={view === "results"} aria-controls="growth-results" onClick={() => showView("results")}>{t.resultsNav}</button>
      </nav>
      <div className={styles.workspace} data-view={view}>
        <div id="growth-inputs" className={styles.editor} onFocusCapture={e => {
          const node = e.target;
          if (!(node instanceof HTMLElement) || node.closest("[popover]")) return;
          requestAnimationFrame(() => {
            const box = node.getBoundingClientRect();
            // Leave room for the site navigation and floating chat launcher.
            if (box.top < 150 || box.bottom > innerHeight - 100) node.scrollIntoView({ block: "center", behavior: "instant" });
          });
        }}>
          <div className={styles.editorHeading}><div><p className={styles.eyebrow}>{t.workspace}</p><h2 id="growth-inputs-heading" tabIndex={-1}>{t.inputs}</h2></div><span className={styles.badge}>{model.scenarios.length}/3 · {t.scenario}</span></div>
          <div className={styles.scenarioChooser}>
            <Select id="growth-scenario" label={t.scenario} value={s.id} options={model.scenarios.map((item, i) => ({ value: item.id, label: scenarioName(item, i, t) }))} onChange={id => { setSelected(model.scenarios.findIndex(item => item.id === id)); dismissShare(); }} />
            <div className={styles.actions}><button disabled={disabled || model.scenarios.length >= 3} onClick={() => { const next = { ...structuredClone(s), id: crypto.randomUUID(), name: `${s.name.slice(0, 65)} · ${t.copySuffix}` }; change({ ...draft, scenarios: [...draft.scenarios, next] }); setSelected(draft.scenarios.length); }}>{t.addScenario}</button><button className={styles.destructive} disabled={disabled || model.scenarios.length < 2} onClick={() => { change({ ...draft, scenarios: draft.scenarios.filter((_, i) => i !== index) }); setSelected(0); requestAnimationFrame(() => document.getElementById("growth-scenario")?.focus()); }}>{t.removeScenario}</button></div>
          </div>
          <details className={styles.editorSection} data-section="campaign"><summary>{t.campaignSetup}<span>{model.currency}</span></summary><div className={styles.detailsBody}>
            <Input path="model.title" label={t.titleField} value={model.title} max={120} disabled={disabled} issues={issues} locale={locale} onChange={title => change({ ...draft, title })} />
            <Select id="growth-currency" label={t.currency} value={model.currency} disabled={disabled} options={["USD", "EUR", "CHF"].map(value => ({ value: value as Model["currency"], label: value }))} onChange={currency => change({ ...draft, currency })} /><p className={styles.hint}>{t.currencyNote}</p><p className={styles.hint}>{t.defaultsNote}</p>
          </div></details>
          <details className={styles.editorSection} data-section="scenario"><summary>{t.scenarioSetup}<span>{t[s.mode]}</span></summary><div className={styles.detailsBody}>
            {textField("name")}
            <Select id="growth-mode" label={t.mode} value={s.mode} disabled={disabled} options={(["planned", "observed"] as const).map(value => ({ value, label: t[value] }))} onChange={mode => scenarioChange({ mode })} />
            <p className={styles.hint}>{s.mode === "planned" ? t.plannedNote : t.observedNote}</p>
            <Select id="growth-policy" label={t.rewardPolicy} value={s.rewardPolicy} disabled={disabled} options={(["standard", "reduced", "stopped"] as const).map(value => ({ value, label: t[value] }))} onChange={rewardPolicy => scenarioChange({ rewardPolicy, retentionAssumption: "" })} />
            {s.rewardPolicy !== "standard" && <>{textField("retentionAssumption")}<p className={styles.hint}>{s.rewardPolicy === "stopped" ? t.stoppedNote : t.rewardNote}</p></>}
            {numberField("operatingCost", 1_000_000_000)}
            <Select id="growth-allocation" label={t.allocation} value={s.allocation} disabled={disabled} options={(["equal", "eligible", "spend"] as const).map(value => ({ value, label: t[value] }))} onChange={allocation => scenarioChange({ allocation })} />
            <p className={styles.hint}>{t.allocationNote}</p>
          </div></details>

          <details className={styles.editorSection} data-section="measurement"><summary>{t.measurement}<span>{s.retentionDays} {locale === "de" ? "Tage" : "days"}</span></summary><div className={styles.detailsBody}>
            {textField("activationEvent")}
            <Select id="growth-unit" label={t.unit} value={s.unit} disabled={disabled} options={(["accounts", "addresses", "authenticatedUsers"] as const).map(value => ({ value, label: t[value] }))} onChange={unit => scenarioChange({ unit })} />
            <div className={styles.fieldGrid}>{textField("cohortStart")}{textField("cohortEnd")}</div>
            {numberField("retentionDays", 730, true)}{textField("retentionEvent")}{textField("exclusions")}{textField("attribution")}{textField("assumptions")}{textField("nextExperiment")}{textField("evidenceUrl")}
          </div></details>

          <section className={styles.channelSection}><div className={styles.editorHeading}><h3>{t.channels}</h3><span className={styles.badge}>{s.channels.length}/8</span></div><p className={styles.hint}>{t.actionHint}</p>
            {s.channels.map((c, ci) => {
              const cp = `${sp}.channels.${ci}`;
              const n = (key: "spend" | "rawParticipants" | "eligibleParticipants" | "activationRate" | "retentionRate" | "rewardedShare" | "activatedCount" | "retainedCount" | "rewardedCount" | "rewardAmount" | "tokenPrice", max: number, integer = false) => <Input key={key} path={`${cp}.${key}`} label={key === "spend" ? t.acquisitionSpend : t[key]} value={c[key]} numeric integer={integer} max={max} disabled={disabled} issues={issues} locale={locale} onChange={v => channelChange(ci, { [key]: v.trim() === "" ? NaN : Number(v) })} />;
              return <details className={styles.channel} key={`${s.id}-${c.id}`} open={ci === 0}><summary>{String(ci + 1).padStart(2, "0")} · {c.name || t.channel}</summary><div className={styles.detailsBody}>
                <Input path={`${cp}.name`} label={t.name} value={c.name} max={80} disabled={disabled} issues={issues} locale={locale} onChange={name => channelChange(ci, { name })} />
                {n("spend", 1_000_000_000)}<div className={styles.fieldGrid}>{n("rawParticipants", 100_000_000, true)}{n("eligibleParticipants", 100_000_000, true)}</div><p className={styles.hint}>{t.rawNote}</p>
                {s.mode === "planned" ? <div className={styles.fieldGrid}>{n("activationRate", 100)}{n("retentionRate", 100)}{n("rewardedShare", 100)}</div> : <>
                  {n("activatedCount", 100_000_000, true)}{n("rewardedCount", 100_000_000, true)}
                  <label className={styles.check}><input disabled={disabled} type="checkbox" checked={c.observationComplete} onChange={e => channelChange(ci, { observationComplete: e.target.checked })} />{t.observationComplete}</label>{n("retainedCount", 100_000_000, true)}
                </>}
                <Select id={fieldId(`${cp}.rewardType`)} label={t.rewardType} value={c.rewardType} disabled={disabled} options={(["cash", "token"] as const).map(value => ({ value, label: t[value] }))} onChange={rewardType => channelChange(ci, { rewardType })} />
                {n("rewardAmount", 1_000_000)}{c.rewardType === "token" && n("tokenPrice", 1_000_000)}
                <button className={styles.destructive} disabled={disabled || s.channels.length <= 1} onClick={() => { scenarioChange({ channels: s.channels.filter((_, i) => ci !== i) }); focusChannel(Math.max(0, ci - 1), false); }}>{t.removeChannel}</button>
              </div></details>;
            })}
            <button disabled={disabled || s.channels.length >= 8} onClick={() => { scenarioChange({ channels: [...s.channels, newChannel(crypto.randomUUID(), t.newChannel)] }); focusChannel(s.channels.length); }}>{t.addChannel}</button>
          </section>
          <button className={`${styles.primary} ${styles.mobileOnly}`} onClick={() => showView("results")}>{t.viewResults} →</button>
        </div>

        <div id="growth-results" className={styles.resultsPane}>
          <div className={styles.headingRow}><div><p className={styles.eyebrow}>{t[s.mode]}</p><h2>{scenarioName(s, index, t)}</h2></div><span className={styles.badge}>{t[s.unit]}</span></div>
          {valid ? <><ScenarioResults model={model} scenario={s} locale={locale} />{model.scenarios.length > 1 ? <Comparison model={model} locale={locale} /> : <section className={styles.comparisonEmpty}><h3>{t.comparison}</h3><p className={styles.hint}>{t.compareHint}</p></section>}<details className={styles.reportDetails}><summary>{t.measurement} · {t.report}</summary><MeasurementReport model={model} scenario={s} locale={locale} /></details></> : <p className={styles.notice}>{t.invalidResults}</p>}
          <section className={styles.exportPanel}><h3>{t.report}</h3><p className={styles.hint}>{t.shareCount}: {model.scenarios.length}</p><div className={styles.actions}><button disabled={!ready || !valid} onClick={() => window.print()}>{t.print}</button><button disabled={!ready || !valid || busy} aria-busy={busy} onClick={() => void png()}>{busy ? t.generating : t.png}</button></div></section>
          <button className={styles.mobileOnly} onClick={() => showView("inputs")}>← {t.editInputs}</button>
        </div>
      </div>
      <div className={styles.language}><button disabled={!ready || !valid} onClick={switchLanguage}>{t.language}</button><p className={styles.hint}>{t.languageNote}</p></div>
    </div>
    {valid ? <PrintReport model={model} locale={locale} /> : <div className={styles.printOnly}><h1>{t.title}</h1><p>{t.invalidResults}</p>{issues.map(issue => <p key={`${issue.path}-${issue.code}`}>{issueText(issue, locale)}</p>)}</div>}
  </div>;
}
