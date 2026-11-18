"use client";

import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { usePopup } from "@/simulator/components/fields/use-popup";
import { Chevron, Tick } from "@/simulator/components/fields/icons";
import controls from "@/simulator/components/fields/controls.module.css";
import styles from "./planner.module.css";

/** The site's select-only combobox pattern, popup placement and shared presentation. */
export function Select<T extends string>({ id, label, value, options, onChange, disabled = false }: {
  id: string; label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; disabled?: boolean;
}) {
  const anchor = useRef<HTMLButtonElement>(null), popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const typed = useRef({ text: "", at: 0 });
  const dismiss = useCallback(() => setOpen(false), []);
  usePopup({ open, onDismiss: dismiss, anchor, popup, align: "start", gap: 4, matchWidth: true });
  useLayoutEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);
  const chosen = Math.max(0, options.findIndex(o => o.value === value));
  const choose = (i: number) => { if (!disabled && options[i]) onChange(options[i].value); setOpen(false); };
  function keyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const last = options.length - 1;
    if (e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const str = e.timeStamp - typed.current.at > 500 ? e.key : typed.current.text + e.key;
      typed.current = { text: str, at: e.timeStamp };
      const repeated = [...str].every(c => c === str[0]);
      const needle = (repeated ? str[0] : str).toLocaleLowerCase();
      for (let j = 0; j < options.length; j++) {
        const i = ((open ? active : chosen) + (repeated ? 1 : 0) + j) % options.length;
        if (options[i].label.toLocaleLowerCase().startsWith(needle)) { setActive(i); setOpen(true); break; }
      }
      return;
    }
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " ", "Home", "End"].includes(e.key)) {
      e.preventDefault(); setActive(e.key === "Home" ? 0 : e.key === "End" ? last : chosen); setOpen(true); return;
    }
    if (!open) return;
    switch (e.key) {
      case "ArrowDown": setActive(Math.min(last, active + 1)); break;
      case "ArrowUp": setActive(Math.max(0, active - 1)); break;
      case "Home": setActive(0); break;
      case "End": setActive(last); break;
      case "Enter": case " ": choose(active); break;
      case "Escape": setOpen(false); break;
      case "Tab": choose(active); return;
      default: return;
    }
    e.preventDefault();
  }
  return <div className={styles.field}>
    <span id={`${id}-label`} className={styles.label}>{label}</span>
    <button type="button" disabled={disabled} id={id} ref={anchor} role="combobox" aria-labelledby={`${id}-label`} aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-activedescendant={open ? `${id}-option-${active}` : undefined} aria-disabled={disabled} tabIndex={disabled ? -1 : 0} className={controls.select} onBlur={dismiss} onKeyDown={keyDown} onClick={() => { if (!disabled) { setActive(chosen); setOpen(!open); } }}>
      <span>{options[chosen]?.label}</span><Chevron className={controls.chevron} />
    </button>
    <div id={`${id}-list`} ref={popup} role="listbox" aria-labelledby={`${id}-label`} popover="manual" data-open={open} className={controls.popup} onMouseDown={e => e.preventDefault()}>
      {options.map((o, i) => <div key={o.value} id={`${id}-option-${i}`} role="option" aria-selected={value === o.value} data-active={active === i} onPointerMove={() => setActive(i)} onClick={() => choose(i)} className={controls.option}><span>{o.label}</span><span className={controls.mark} aria-hidden><Tick className={controls.tick} /></span></div>)}
    </div>
  </div>;
}
