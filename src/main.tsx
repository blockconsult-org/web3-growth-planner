import { createRoot } from 'react-dom/client';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import Page from './Page';
import meta from '../app.json';
import '../app/globals.css';
import '../simulator/styles/fields.css';
import './desktop.css';

declare global { interface Window { desktop?: { savePdf: () => Promise<boolean> } } }
if (window.desktop) window.print = () => { void window.desktop!.savePdf(); };
let initialTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
try { initialTheme = localStorage.getItem('bc:desktop:theme') || initialTheme; } catch { /* Storage is optional. */ }
document.documentElement.dataset.theme = initialTheme;

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="desktop-error"><h1>Unable to open the workspace</h1><p>Your saved files have not changed. Restart the app, or report this issue on GitHub.</p><button onClick={() => location.reload()}>Try again / Erneut versuchen</button><a href={meta.repository + '/issues'}>Report an issue</a></main> : this.props.children; }
}

function App() {
  const [locale, setLocale] = useState<'en' | 'de'>(location.pathname.startsWith('/de') ? 'de' : 'en');
  const [theme, setTheme] = useState(initialTheme);
  const [snapshot, setSnapshot] = useState('');
  const [error, setError] = useState('');
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const onLocale = (event: Event) => {
      const next = (event as CustomEvent).detail;
      if (next !== 'en' && next !== 'de') return;
      setLocale(next);
      history.replaceState(null, '', (next === 'de' ? '/de' : '') + meta.publicPath + location.hash);
    };
    window.addEventListener('bc:locale', onLocale);
    return () => window.removeEventListener('bc:locale', onLocale);
  }, []);
  const de = locale === 'de';
  document.documentElement.lang = locale;
  function changeTheme() { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); document.documentElement.dataset.theme = next; try { localStorage.setItem('bc:desktop:theme', next); } catch { /* Still works without persistence. */ } }
  function openSnapshot() {
    try {
      const url = new URL(snapshot.trim());
      if (url.protocol !== 'https:' || !['www.blockconsult.org', 'blockconsult.org'].includes(url.hostname) || ![meta.publicPath, '/de' + meta.publicPath].includes(url.pathname) || !url.hash || url.hash.length > 200000) throw new Error();
      location.assign(url.pathname + url.hash);
    } catch { setError(de ? 'Fügen Sie einen gültigen Freigabelink für dieses Tool ein.' : 'Paste a valid share link for this tool.'); }
  }
  return <>
    <a className="desktop-skip" href="#main">{de ? 'Zum Werkzeug' : 'Skip to workspace'}</a>
    <header className="desktop-bar">
      <a className="desktop-brand" href="https://www.blockconsult.org" aria-label="Block Consult website"><img src="/icon.png" alt="" /><span>Block Consult<span className="desktop-edition">Desktop</span></span></a>
      <nav aria-label={de ? 'App-Einstellungen' : 'App controls'}>
        <span className="desktop-local"><i aria-hidden="true" />{de ? 'Lokal auf Ihrem Gerät' : 'Local to your device'}</span>
        <button onClick={() => { setError(''); modal.current?.showModal(); }}>{de ? 'Link öffnen' : 'Open share link'}</button>
        {meta.slug === 'tokenomics-simulator' && <button aria-label={de ? 'Switch to English' : 'Auf Deutsch wechseln'} onClick={() => { const next = de ? 'en' : 'de'; history.replaceState(null, '', (next === 'de' ? '/de' : '') + meta.publicPath + location.hash); setLocale(next); }}>{de ? 'EN' : 'DE'}</button>}
        <button aria-label={de ? 'Farbschema wechseln' : 'Toggle color theme'} onClick={changeTheme}>{theme === 'dark' ? (de ? 'Hell' : 'Light') : (de ? 'Dunkel' : 'Dark')}</button>
      </nav>
    </header>
    <main id="main"><Page locale={locale} /></main>
    <footer className="desktop-footer"><span>© 2026 Block Consult GmbH</span><span>{de ? 'Offline nutzbar · Keine Telemetrie' : 'Works offline · No telemetry'}</span><a href={meta.repository}>{de ? 'Quellcode & Hilfe' : 'Source & help'} ↗</a><span>v{meta.version}</span></footer>
    <dialog className="desktop-dialog" ref={modal} onClick={e => { if (e.target === e.currentTarget) modal.current?.close(); }}>
      <form onSubmit={e => { e.preventDefault(); openSnapshot(); }}>
        <h2>{de ? 'Geteiltes Szenario öffnen' : 'Open a shared scenario'}</h2><p>{de ? 'Der Link wird lokal gelesen. Es wird keine Website geladen. Speichern Sie Ihre aktuelle Arbeit vor dem Öffnen.' : 'The link is read locally. No website is loaded. Save your current work before opening another scenario.'}</p>
        <label htmlFor="snapshot">{de ? 'Freigabelink' : 'Share link'}</label><textarea id="snapshot" autoFocus value={snapshot} onChange={e => setSnapshot(e.target.value)} rows={4} required />
        {error && <p role="alert">{error}</p>}
        <div><button type="button" onClick={() => modal.current?.close()}>{de ? 'Abbrechen' : 'Cancel'}</button><button type="submit">{de ? 'Szenario öffnen' : 'Open scenario'}</button></div>
      </form>
    </dialog>
  </>;
}
createRoot(document.getElementById('root')!).render(<Boundary><App /></Boundary>);
