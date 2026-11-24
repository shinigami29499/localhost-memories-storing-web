import { useEffect } from "react";
import "./project-tooltip.css";

/** Presents existing title hints consistently without changing the controls they describe. */
export function ProjectTooltip() {
  useEffect(() => {
    let target: Element | null = null;
    let label = "";
    let popup: HTMLDivElement | null = null;
    let observer: MutationObserver | null = null;
    let timer = 0;

    const hide = () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      observer = null;
      if (target && !target.hasAttribute("title")) target.setAttribute("title", label);
      target = null;
      popup?.remove();
      popup = null;
    };

    const position = () => {
      if (!target?.isConnected || !popup) { hide(); return; }
      const bounds = target.getBoundingClientRect();
      const tip = popup.getBoundingClientRect();
      const left = Math.max(8, Math.min(window.innerWidth - tip.width - 8, bounds.left + (bounds.width - tip.width) / 2));
      const top = bounds.top >= tip.height + 8 ? bounds.top - tip.height - 6 : bounds.bottom + 6;
      popup.style.left = `${left}px`;
      popup.style.top = `${Math.max(8, Math.min(window.innerHeight - tip.height - 8, top))}px`;
    };

    const show = (element: Element) => {
      if (target === element) { window.clearTimeout(timer); return; }
      hide();
      const text = element.getAttribute("title");
      if (!text?.trim()) return;
      target = element;
      label = text;
      element.removeAttribute("title");
      popup = document.createElement("div");
      popup.className = "project-tooltip";
      popup.setAttribute("aria-hidden", "true");
      popup.textContent = text;
      (element.closest("dialog[open]") ?? document.body).appendChild(popup);
      popup.addEventListener("pointerenter", () => window.clearTimeout(timer));
      popup.addEventListener("pointerleave", () => { timer = window.setTimeout(hide, 100); });
      observer = new MutationObserver(() => {
        const updated = element.getAttribute("title");
        if (updated === null) return;
        if (!updated.trim()) { hide(); return; }
        label = updated;
        element.removeAttribute("title");
        if (popup) popup.textContent = updated;
        position();
      });
      observer.observe(element, { attributes: true, attributeFilter: ["title"] });
      position();
    };

    const over = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
      if (popup?.contains(event.target)) { window.clearTimeout(timer); return; }
      const element = event.target.closest("[title]") ?? (target?.contains(event.target) ? target : null);
      if (element) show(element);
    };
    const out = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !target || !(event.target instanceof Node) || !target.contains(event.target)) return;
      if (event.relatedTarget instanceof Node && (target.contains(event.relatedTarget) || popup?.contains(event.relatedTarget))) return;
      timer = window.setTimeout(() => { if (!target?.matches(":focus-visible")) hide(); }, 100);
    };
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.matches(":focus-visible")) {
        const element = event.target.closest("[title]");
        if (element) show(element);
      }
    };
    const blur = (event: FocusEvent) => {
      if (target === event.target && !target.matches(":hover")) hide();
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      hide();
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }, []);
  return null;
}
