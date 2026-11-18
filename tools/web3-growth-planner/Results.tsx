import { useId } from "react";
import { calculateModel, calculateScenario, comparable } from "./calculate";
import { copy, formatters, scenarioName } from "./copy";
import type { Locale, Model, Scenario } from "./model";
import styles from "./planner.module.css";

export function Comparison({ model, locale }: { model: Model; locale: Locale }) {
  const headingId = useId();
  const t = copy(locale), f = formatters(locale, model.currency), results = calculateModel(model);
  const same = model.scenarios.every(s => comparable(model.scenarios[0], s, model.textOmitted));
  return <section className={styles.panel} aria-labelledby={headingId}>
    <h2 id={headingId}>{t.comparison}</h2>
    <p className={styles.hint}>{same ? t.comparable : t.separate}</p>
    <p className={styles.tableHint}>{t.scrollTable} →</p><div className={styles.tableWrap} tabIndex={0} role="region" aria-label={t.comparison}>
      <table><caption className={styles.srOnly}>{t.comparison}</caption><thead><tr><th scope="col">{t.scenario}</th><th scope="col">{t.mode}</th><th scope="col">{t.total}</th><th scope="col">{t.activated}</th><th scope="col">{t.retained}</th><th scope="col">{t.costPerActivated}</th><th scope="col">{t.costPerRetained}</th></tr></thead>
        <tbody>{results.map((r, i) => <tr key={model.scenarios[i].id}><th scope="row">{scenarioName(model.scenarios[i], i, t)}</th><td>{t[model.scenarios[i].mode]}</td><td>{f.money(r.totalCost)}</td><td>{f.count(r.activated)}</td><td>{r.complete ? f.count(r.retained) : t.pending}</td><td>{f.money(r.costPerActivated)}</td><td>{f.money(r.costPerRetained)}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}

export function ScenarioResults({ model, scenario: s, locale }: { model: Model; scenario: Scenario; locale: Locale }) {
  const t = copy(locale), f = formatters(locale, model.currency), r = calculateScenario(s);
  const metrics = [[t.totalCost, f.money(r.totalCost)], [t.activated, f.count(r.activated)], [t.costPerActivated, f.money(r.costPerActivated)], [t.costPerRetained, f.money(r.costPerRetained)]];
  const funnel = [[t.raw, r.raw], [t.eligibleCount, r.eligible], [t.activated, r.activated], [t.retained, r.retained]] as const;
  const budget = [[t.acquisition, r.spend], [t.rewardCost, r.rewardCost], [t.operating, r.operatingCost]] as const;
  return <div className={styles.resultStack}>
    <section aria-label={t.results} className={styles.metrics}>{metrics.map(([label, value]) => <div className={styles.metric} key={label}><span>{label}</span><strong data-long={value.length > 17}>{value}</strong></div>)}</section>
    <div className={styles.chartGrid}>
      <section className={styles.panel}><h3>{t.funnel}</h3><p className={styles.hint}>{t[s.unit]} · {t[s.mode]}</p><dl className={styles.barList}>{funnel.map(([label, n], i) => <div key={label}><dt>{label}</dt><dd>{n === null ? t.pending : f.count(n)}</dd><div aria-hidden="true" className={styles.barTrack}><div style={{ width: `${r.raw > 0 ? (n ?? 0) / r.raw * 100 : 0}%`, opacity: 1 - i * 0.13 }} /></div></div>)}</dl><p className={styles.hint}>{t.activationRate.replace(" (%)", "")}: {f.percent(r.activationRate)}<br />{t.retentionRate.replace(" (%)", "")}: {f.percent(r.retentionRate)}</p></section>
      <section className={styles.panel}><h3>{t.budget}</h3><p className={styles.hint}>{t.budgetNote}</p><dl className={styles.barList}>{budget.map(([label, n]) => <div key={label}><dt>{label}</dt><dd>{f.money(n)}</dd><div aria-hidden="true" className={styles.barTrack}><div style={{ width: `${r.totalCost > 0 ? n / r.totalCost * 100 : 0}%` }} /></div></div>)}</dl><p className={styles.hint}>{t.allocationRule}: {t[s.allocation]}</p></section>
    </div>
    <section className={styles.dependencyPanel}><h3>{t.dependency}</h3><div className={styles.dependency}><p><strong>{f.percent(r.rewardBudgetShare)}</strong><span>{t.rewardBudgetShare}</span></p><p><strong>{f.percent(r.rewardedShare)}</strong><span>{t.participantsRewarded}</span></p></div><p className={styles.hint}>{t.rewardNote}</p>{s.rewardPolicy !== "standard" && <p>{s.retentionAssumption || t.omitted}</p>}</section>
    {!r.complete && <section className={styles.notice}><h3>{t.mature} · {r.mature.channels}/{s.channels.length}</h3><p>{t.retained}: {f.count(r.mature.retained)} · {t.costPerRetained}: {f.money(r.mature.costPerRetained)}</p><p className={styles.hint}>{t.matureNote}</p></section>}
    <section className={styles.panel}><h3>{t.breakdown}</h3><p className={`${styles.tableHint} ${styles.channelTableHint}`}>{t.scrollTable} →</p><div className={`${styles.tableWrap} ${styles.channelTable}`} role="region" aria-label={t.breakdown} tabIndex={0}><table><caption className={styles.srOnly}>{t.breakdown}</caption><thead><tr><th scope="col">{t.channel}</th><th scope="col">{t.acquisition}</th><th scope="col">{t.rewardCost}</th><th scope="col">{t.operating}</th><th scope="col">{t.total}</th><th scope="col">{t.activated}</th><th scope="col">{t.retained}</th><th scope="col">{t.costPerActivated}</th><th scope="col">{t.costPerRetained}</th></tr></thead><tbody>{r.channels.map((c, i) => <tr key={c.id}><th scope="row">{s.channels[i].name || `${t.channel} ${i + 1}`}</th><td>{f.money(c.spend)}</td><td>{f.money(c.rewardCost)}</td><td>{f.money(c.operatingCost)}</td><td>{f.money(c.totalCost)}</td><td>{f.count(c.activated)}</td><td>{c.retained === null ? t.pending : f.count(c.retained)}</td><td>{f.money(c.costPerActivated)}</td><td>{f.money(c.costPerRetained)}</td></tr>)}</tbody></table></div><div className={styles.channelCards}>{r.channels.map((c, i) => <section className={styles.channelCard} key={c.id}>
      <h4>{s.channels[i].name || `${t.channel} ${i + 1}`}</h4><dl>
        <div className={styles.channelTotal}><dt>{t.totalCost}</dt><dd>{f.money(c.totalCost)}</dd></div>
        {[[t.activated, f.count(c.activated)], [t.retained, c.retained === null ? t.pending : f.count(c.retained)], [t.costPerActivated, f.money(c.costPerActivated)], [t.costPerRetained, f.money(c.costPerRetained)], [t.acquisition, f.money(c.spend)], [t.rewardCost, f.money(c.rewardCost)], [t.operating, f.money(c.operatingCost)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </section>)}</div><p className={styles.hint}>{t.weighted} {t.rounded}</p></section>
  </div>;
}

export function MeasurementReport({ model, scenario: s, locale }: { model: Model; scenario: Scenario; locale: Locale }) {
  const t = copy(locale), f = formatters(locale, model.currency);
  return <section className={`${styles.panel} ${styles.measurementPanel}`}><h3>{t.measurement}</h3><dl className={styles.measurementReport}>
    <dt>{t.countUnit}</dt><dd>{t[s.unit]}</dd><dt>{t.cohortStart}</dt><dd>{s.cohortStart} → {s.cohortEnd}</dd><dt>{t.observationWindow}</dt><dd>{s.retentionDays} {t.days}</dd>
    {(["activationEvent", "retentionEvent", "exclusions", "attribution", "assumptions", "nextExperiment", "retentionAssumption", "evidenceUrl"] as const).map(key => <div key={key}><dt>{t[key]}</dt><dd>{s[key] || (model.textOmitted ? t.omitted : t.empty)}</dd></div>)}
    <dt>{t.allocationRule}</dt><dd>{t[s.allocation]} · {t.allocationNote}</dd>
  </dl><h4>{t.details}</h4>{s.channels.map((c, i) => <div key={c.id} className={styles.printChannel}><h4>{c.name || `${t.channel} ${i + 1}`}</h4><p>{t.raw}: {f.count(c.rawParticipants)} · {t.eligibleCount}: {f.count(c.eligibleParticipants)}<br />{s.mode === "planned" ? `${t.activationRate}: ${f.decimal(c.activationRate)} · ${t.retentionRate}: ${f.decimal(c.retentionRate)} · ${t.rewardedShare}: ${f.decimal(c.rewardedShare)}` : `${t.activatedCount}: ${f.count(c.activatedCount)} · ${t.retainedCount}: ${c.observationComplete ? f.count(c.retainedCount) : t.pending} · ${t.rewardedCount}: ${f.count(c.rewardedCount)}`}<br />{t.rewardAmount}: {f.decimal(c.rewardAmount)} {c.rewardType === "cash" ? model.currency : t.token} · {t.rewardValuation}: {c.rewardType === "cash" ? "1" : `${f.decimal(c.tokenPrice)} ${model.currency}`}</p></div>)}</section>;
}

export function PrintReport({ model, locale }: { model: Model; locale: Locale }) {
  const t = copy(locale);
  return <div className={styles.printOnly} data-testid="print-report"><h1>{t.title}</h1><p>{model.title || t.campaign} · {t.methodologyVersion}</p>{model.textOmitted && <p>{t.omittedNote}</p>}
    <Comparison model={model} locale={locale} />
    {model.scenarios.map((s, i) => <section key={s.id} className={styles.printScenario}><h2>{scenarioName(s, i, t)} · {t[s.mode]} · {t[s.rewardPolicy]}</h2><p>{s.mode === "planned" ? t.plannedNote : t.observedNote}</p><ScenarioResults model={model} scenario={s} locale={locale} /><MeasurementReport model={model} scenario={s} locale={locale} /></section>)}
    <p>{t.methodBody}</p>
  </div>;
}
