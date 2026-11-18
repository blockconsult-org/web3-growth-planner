"use client";
import { ActionMenu as SharedMenu, ActionMenuItem } from "@/simulator/components/actions/menu";
import styles from "./planner.module.css";
type Action = { label: string; disabled?: boolean; destructive?: boolean; onClick: () => void };
export function ActionMenu({ label, note, actions }: { label: string; note: string; actions: Action[] }) {
  return <SharedMenu label={label} note={note} className={styles.actionMenu}>{actions.map(action => <ActionMenuItem key={action.label} disabled={action.disabled} destructive={action.destructive} onClick={action.onClick}>{action.label}</ActionMenuItem>)}</SharedMenu>;
}
