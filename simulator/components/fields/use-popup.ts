"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * Placement of the simulator's popups: the help text, the list a select
 * opens and the menu of actions in the toolbar. All three sit in the
 * browser's top layer where it has one, so no scroll box cuts them off, and
 * all three are put next to the control that opened them by `placePopup`.
 */

/* Pixels between a popup and the edge of the window: step 3 of the spacing
   scale. The stylesheet caps a popup's size with the same edge distance. */
const EDGE = 12;

/** Where a popup sits across its anchor: centred on it, or with its left or
 *  right edge on the anchor's. */
export type PopupAlign = "start" | "center" | "end";

export interface PopupPlacement {
  align: PopupAlign;
  /** Pixels between the anchor and the popup. */
  gap: number;
  /** The popup is never narrower than its anchor: a list under a select. */
  matchWidth?: boolean;
}

/**
 * Puts a shown popup under its anchor, or above it when there is no room
 * below, and pulls it in from the edges of the window either way.
 *
 * Returns false when the anchor has scrolled out of the window. A popup held
 * at the edge would then point at nothing, so the caller closes it.
 */
export function placePopup(
  anchor: HTMLElement,
  popup: HTMLElement,
  { align, gap, matchWidth = false }: PopupPlacement,
): boolean {
  const box = anchor.getBoundingClientRect();
  // The root's client box leaves out a classic scrollbar; innerWidth does not.
  const viewWidth = document.documentElement.clientWidth;
  const viewHeight = document.documentElement.clientHeight;

  if (
    box.bottom < 0 ||
    box.top > viewHeight ||
    box.right < 0 ||
    box.left > viewWidth
  ) {
    return false;
  }

  if (matchWidth) popup.style.minWidth = `${Math.round(box.width)}px`;
  const width = popup.offsetWidth;
  const height = popup.offsetHeight;

  const wanted =
    align === "center"
      ? box.left + box.width / 2 - width / 2
      : align === "end"
        ? box.right - width
        : box.left;
  const left = Math.max(EDGE, Math.min(wanted, viewWidth - EDGE - width));

  const below = box.bottom + gap;
  const above = box.top - gap - height;
  const fitsBelow = below + height <= viewHeight - EDGE;
  const preferred = fitsBelow || above < EDGE ? below : above;
  const top = Math.max(EDGE, Math.min(preferred, viewHeight - EDGE - height));

  popup.style.left = `${Math.round(left)}px`;
  popup.style.top = `${Math.round(top)}px`;
  return true;
}

/**
 * Calls `place` again whenever the anchor may have moved: on a resize and on
 * scrolling in any scroll box. Scroll events do not bubble, hence the
 * capture. Returns the function that stops it.
 */
export function followAnchor(place: () => void): () => void {
  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, { capture: true, passive: true });
  return () => {
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, { capture: true });
  };
}

interface PopupOptions extends PopupPlacement {
  open: boolean;
  /** Called when the popup should close without a choice: a press outside
   *  it, or its anchor leaving the window. Must keep its identity between
   *  renders. */
  onDismiss: () => void;
  anchor: RefObject<HTMLElement | null>;
  popup: RefObject<HTMLElement | null>;
}

/**
 * Shows a popup while `open` is true and keeps it beside its anchor.
 *
 * The popup element carries `popover="manual"`: the component decides when
 * it opens and closes, and the browser only lifts it into the top layer. A
 * browser without popovers leaves it where its fixed position puts it, which
 * the stylesheet allows for.
 */
export function usePopup({
  open,
  onDismiss,
  anchor,
  popup,
  align,
  gap,
  matchWidth,
}: PopupOptions): void {
  // A layout effect, so the popup is in place before it is first painted.
  useLayoutEffect(() => {
    if (!open) return;
    const anchorElement = anchor.current;
    const popupElement = popup.current;
    if (!anchorElement || !popupElement) return;

    const inTopLayer = typeof popupElement.showPopover === "function";
    if (inTopLayer) popupElement.showPopover();

    const place = () => {
      if (!placePopup(anchorElement, popupElement, { align, gap, matchWidth })) {
        onDismiss();
      }
    };
    place();
    const stopFollowing = followAnchor(place);

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !anchorElement.contains(event.target) &&
        !popupElement.contains(event.target)
      ) {
        onDismiss();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      stopFollowing();
      document.removeEventListener("pointerdown", onPointerDown);
      if (inTopLayer && popupElement.matches(":popover-open")) {
        popupElement.hidePopover();
      }
    };
  }, [open, onDismiss, anchor, popup, align, gap, matchWidth]);
}
