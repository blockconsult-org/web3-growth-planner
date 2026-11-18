"use client";

import { useEffect, useRef } from "react";
import { localeHref, type Locale } from "@/content/i18n";
import styles from "./tool-header.module.css";

const tools = [
  { id: "ai-opportunity-finder", group: "ai", en: "Opportunity finder", de: "Chancenfinder", output: { en: "A ranked shortlist and a 90-day action plan", de: "Eine priorisierte Auswahl und ein 90-Tage-Plan" } },
  { id: "ai-roi", group: "ai", en: "ROI calculator", de: "ROI-Rechner", output: { en: "A business case across three scenarios", de: "Eine Wirtschaftlichkeitsrechnung mit drei Szenarien" } },
  { id: "ai-workflow-blueprint", group: "ai", en: "Workflow blueprint", de: "Workflow-Blueprint", output: { en: "A workflow map and an implementation brief", de: "Ein Workflow-Diagramm und ein Umsetzungsbriefing" } },
  { id: "web3-due-diligence", group: "web3", en: "Due diligence scorecard", de: "Due-Diligence-Scorecard", output: { en: "An evidence review with questions to resolve", de: "Eine Belegübersicht mit offenen Prüffragen" } },
  { id: "dao-governance", group: "web3", en: "Governance simulator", de: "Governance-Simulator", output: { en: "A comparison of voting rules and outcomes", de: "Ein Vergleich von Abstimmungsregeln und Ergebnissen" } },
  { id: "web3-growth-planner", group: "web3", en: "Growth & incentive planner", de: "Wachstums- & Anreizplaner", output: { en: "A campaign plan with costs and retention", de: "Ein Kampagnenplan mit Kosten und Nutzerbindung" } },
] as const;

export type ToolId = typeof tools[number]["id"];

export function ToolHeader({ tool, locale, title, lead, note, titleId, printTitle = false }: {
  tool: ToolId;
  locale: Locale;
  title: string;
  lead: string;
  note?: string;
  titleId?: string;
  printTitle?: boolean;
}) {
  const current = tools.find(item => item.id === tool)!;
  const menu = useRef<HTMLDetailsElement>(null);
  const de = locale === "de";

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) menu.current?.removeAttribute("open");
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return <header className={styles.header} data-tool-header data-print-title={printTitle || undefined}>
    <div className={styles.inner}>
      <div className={styles.topline}>
        <p className={styles.eyebrow}><span className={styles.mark} aria-hidden="true" /><span>{current.group === "ai" ? (de ? "KI & Automation" : "AI & automation") : "Web3"}</span><span className={styles.separator}>/</span><span className={styles.suiteLabel}>{de ? "Werkzeuge" : "Tools"}</span></p>
        <details ref={menu} className={styles.switcher} onKeyDown={event => {
          if (event.key === "Escape" && menu.current?.open) {
            event.preventDefault(); menu.current.open = false; menu.current.querySelector("summary")?.focus();
          }
        }} onBlur={event => {
          if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
        }}>
          <summary>{de ? "Alle Tools" : "All tools"}<span aria-hidden="true">⌄</span></summary>
          <nav className={styles.menu} aria-label={de ? "Weitere Werkzeuge" : "Explore tools"} data-tool-navigation>
            {(["ai", "web3"] as const).map(group => <div key={group}>
              <p>{group === "ai" ? (de ? "KI & Automatisierung" : "AI & automation") : "Web3"}</p>
              {tools.filter(item => item.group === group).map(item => <a key={item.id} href={item.id === tool ? localeHref(locale, `/tools/${item.id}`) : `https://www.blockconsult.org${localeHref(locale, `/tools/${item.id}`)}`} aria-current={item.id === tool ? "page" : undefined} onClick={event => {
                if (item.id === tool) { event.preventDefault(); if (menu.current) menu.current.open = false; menu.current?.querySelector("summary")?.focus(); }
              }}><span>{item[locale]}</span><span aria-hidden="true">{item.id === tool ? "●" : "↗"}</span></a>)}
            </div>)}
            <a className={styles.collection} href={localeHref(locale, "/tools")}>{de ? "Zur Tool-Übersicht" : "Browse all tools"}<span aria-hidden="true">→</span></a>
          </nav>
        </details>
      </div>
      <div className={styles.grid}>
        <div><h1 id={titleId}>{title}</h1><p className={styles.local}>{de ? "Ohne Anmeldung" : "No sign-up"}<span aria-hidden="true">·</span>{de ? "Läuft offline" : "Works offline"}</p></div>
        <div className={styles.description}><p className={styles.lead}>{lead}</p><p className={styles.output}><span>{de ? "Ihr Ergebnis" : "Your output"}</span>{current.output[locale]}</p>{note && <p className={styles.note}>{note}</p>}</div>
      </div>
    </div>
  </header>;
}
