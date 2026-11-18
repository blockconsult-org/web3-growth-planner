"use client";

import { createContext, useCallback, useContext, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { usePopup } from "../fields/use-popup";
import { Chevron } from "../fields/icons";
import controls from "../fields/controls.module.css";
import styles from "./actions.module.css";

const CloseMenu = createContext<() => void>(() => {});

/** Ordinary action buttons keep native Tab navigation; arrow keys offer a shortcut. */
export function ActionMenu({ label, children, className = "", note }: {
  label: string; children: ReactNode; className?: string; note?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const enter = useRef<"first" | "last" | null>(null);
  const [open, setOpen] = useState(false);
  const dismiss = useCallback(() => setOpen(false), []);
  usePopup({ open, onDismiss: dismiss, anchor: trigger, popup: panel, align: "end", gap: 4 });
  const items = () => [...(panel.current?.querySelectorAll<HTMLButtonElement>("button:enabled") ?? [])];
  useLayoutEffect(() => {
    if (!open) return;
    if (panel.current) panel.current.scrollTop = 0;
    if (!enter.current) return;
    const buttons = items();
    (enter.current === "last" ? buttons.at(-1) : buttons[0])?.focus();
    enter.current = null;
  }, [open]);
  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }, []);
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    const { key } = event;
    if (key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) return;
    if (!open) {
      if (key !== "ArrowDown" && key !== "ArrowUp") return;
      event.preventDefault(); enter.current = key === "ArrowUp" ? "last" : "first"; setOpen(true); return;
    }
    const buttons = items();
    if (!buttons.length) return;
    event.preventDefault();
    const from = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const to = key === "Home" ? 0 : key === "End" ? buttons.length - 1 : key === "ArrowDown" ? (from + 1) % buttons.length : from <= 0 ? buttons.length - 1 : from - 1;
    buttons[to]?.focus();
  }
  return <div className={`${styles.menu} ${className}`} onKeyDown={keyboard} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
  }}>
    <button ref={trigger} type="button" data-tool-menu-trigger className={styles.trigger} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <span>{label}</span><Chevron className={controls.chevron} />
    </button>
    <div ref={panel} id={id} role="group" aria-label={label} data-tool-menu popover="manual" data-open={open} className={`${controls.popup} ${styles.panel}`}>
      <CloseMenu value={close}>{children}</CloseMenu>
      {note && <p className={styles.note}>{note}</p>}
    </div>
  </div>;
}

export function ActionMenuItem({ children, disabled, destructive, onClick }: {
  children: ReactNode; disabled?: boolean; destructive?: boolean; onClick: () => void;
}) {
  const close = useContext(CloseMenu);
  return <button type="button" className={styles.item} disabled={disabled} data-destructive={destructive || undefined} onClick={() => { close(); onClick(); }}>
    <span>{children}</span><span aria-hidden>{destructive ? "×" : ""}</span>
  </button>;
}

export function ActionMenuGroup({ children }: { children: ReactNode }) {
  return <p className={styles.group}>{children}</p>;
}
