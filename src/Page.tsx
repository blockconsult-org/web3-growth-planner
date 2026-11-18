import { ToolHeader } from "@/components/tools/ToolHeader";
import Link from "next/link";
import { localeHref } from "@/content/i18n";
import Planner from "@/tools/web3-growth-planner/Planner";
import { copy } from "@/tools/web3-growth-planner/copy";
import { manifest } from "@/tools/web3-growth-planner/manifest";
import styles from "@/tools/web3-growth-planner/planner.module.css";


export default function Page({ locale }: { locale: 'en' | 'de' }) {
  const t = copy(locale);
  return <><ToolHeader tool="web3-growth-planner" locale={locale} title={t.title} lead={t.intro} /><div className={styles.page}>
    <Planner locale={locale} />
    <div className={styles.screenOnly}><details className={styles.method}><summary>{t.method}</summary><p>{t.methodBody}</p><p>{t.rawNote}</p><p>{t.actionHint}</p><p>{t.allocationNote}</p><p>{t.rewardNote}</p><p>{t.methodologyVersion}</p></details><div className={styles.service}><Link href={localeHref(locale, "/services/outreach")}>{t.service} ↗</Link><Link href={localeHref(locale, "/blog/web3-retention-metrics")}>{t.article} →</Link></div></div>
  </div></>;
}
