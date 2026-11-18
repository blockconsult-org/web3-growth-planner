/**
 * The two marks the simulator's controls share. Both are drawn in the
 * current text colour with square line ends, like the site's other line
 * icons, and both are decoration: the control beside them carries the name.
 */

/** The arrow on anything that opens a list or a panel under it. */
export function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden focusable="false" className={className}>
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

/** The mark on the chosen option of a list. */
export function Tick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden focusable="false" className={className}>
      <path
        d="M2 6.4 4.8 9.2 10 3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
