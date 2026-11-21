import { useLayoutEffect, type RefObject } from "react";

// Measure the anchor, but take the gap and viewport gutter from the popup's tokens.
// The top layer lets a select inside a modal extend beyond the modal's scroll area.
export function useAnchoredPopup(
  open: boolean,
  trigger: RefObject<HTMLElement | null>,
  popup: RefObject<HTMLDivElement | null>,
  constrainHeight = true,
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
    const viewport = window.visualViewport;
    const position = () => {
      // iOS keyboards resize/pan the visual viewport, not necessarily innerHeight.
      // Match getBoundingClientRect by keeping bounds in layout coordinates.
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const bottom = top + (viewport?.height ?? window.innerHeight);
      const right = left + width;
      const rect = anchor.getBoundingClientRect();
      if (!constrainHeight) {
        element.style.width = Math.min(rect.width, Math.max(0, width - gutter * 2)) + "px";
        const below = rect.bottom + gap;
        const above = rect.top - gap - element.offsetHeight;
        const preferred = bottom - below - gutter >= element.offsetHeight ? below : above;
        element.style.left =
          Math.max(left + gutter, Math.min(rect.left, right - element.offsetWidth - gutter)) + "px";
        element.style.top =
          Math.max(top + gutter, Math.min(preferred, bottom - element.offsetHeight - gutter)) +
          "px";
        return;
      }
      const below = bottom - rect.bottom - gap - gutter;
      const above = rect.top - top - gap - gutter;
      const upwards = below < Math.min(element.scrollHeight, maxHeight) && above > below;
      const height = Math.min(maxHeight, Math.max(0, upwards ? above : below));
      element.style.maxHeight = height + "px";
      element.style.width = Math.min(rect.width, Math.max(0, width - gutter * 2)) + "px";
      element.style.left =
        Math.max(left + gutter, Math.min(rect.left, right - element.offsetWidth - gutter)) + "px";
      element.style.top =
        (upwards
          ? Math.max(top + gutter, rect.top - gap - element.offsetHeight)
          : rect.bottom + gap) + "px";
    };
    const viewportChanged = (event: Event) => {
      if (event.target instanceof Node && element.contains(event.target)) return;
      position();
    };

    position();
    const observer = new ResizeObserver(position);
    observer.observe(anchor);
    observer.observe(element);
    viewport?.addEventListener("resize", viewportChanged);
    viewport?.addEventListener("scroll", viewportChanged);
    window.addEventListener("resize", viewportChanged);
    window.addEventListener("scroll", viewportChanged, true);
    return () => {
      observer.disconnect();
      viewport?.removeEventListener("resize", viewportChanged);
      viewport?.removeEventListener("scroll", viewportChanged);
      window.removeEventListener("resize", viewportChanged);
      window.removeEventListener("scroll", viewportChanged, true);
      if (element.matches(":popover-open")) element.hidePopover();
    };
  }, [open, trigger, popup, constrainHeight]);
}
