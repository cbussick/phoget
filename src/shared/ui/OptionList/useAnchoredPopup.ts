import { useLayoutEffect, type RefObject } from "react";

// Measure the anchor, but take the gap and viewport gutter from the popup's tokens.
// The top layer lets a select inside a modal extend beyond the modal's scroll area.
export function useAnchoredPopup(
  open: boolean,
  trigger: RefObject<HTMLElement | null>,
  popup: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const element = popup.current;
    const anchor = trigger.current;
    if (!open || !element || !anchor) return;

    if (element.showPopover) element.showPopover();
    const style = getComputedStyle(element);
    const gap = parseFloat(style.paddingTop);
    const gutter = gap * 2;
    const maxHeight = parseFloat(style.maxHeight);
    const position = () => {
      const rect = anchor.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - gap - gutter;
      const above = rect.top - gap - gutter;
      const upwards = below < Math.min(element.scrollHeight, maxHeight) && above > below;
      const height = Math.min(maxHeight, Math.max(0, upwards ? above : below));
      element.style.maxHeight = height + "px";
      element.style.width = Math.min(rect.width, window.innerWidth - gutter * 2) + "px";
      element.style.left =
        Math.max(gutter, Math.min(rect.left, window.innerWidth - element.offsetWidth - gutter)) +
        "px";
      element.style.top =
        (upwards ? Math.max(gutter, rect.top - gap - element.offsetHeight) : rect.bottom + gap) +
        "px";
    };
    const viewportChanged = (event: Event) => {
      if (event.target instanceof Node && element.contains(event.target)) return;
      position();
    };

    position();
    const observer = new ResizeObserver(position);
    observer.observe(anchor);
    observer.observe(element);
    window.addEventListener("resize", viewportChanged);
    window.addEventListener("scroll", viewportChanged, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", viewportChanged);
      window.removeEventListener("scroll", viewportChanged, true);
      if (element.matches(":popover-open")) element.hidePopover();
    };
  }, [open, trigger, popup]);
}
