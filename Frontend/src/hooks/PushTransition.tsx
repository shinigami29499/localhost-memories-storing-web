import { Component, createRef } from "react";
import { ease, motionTokens } from "@animate-ui/react/utils/motion";
import { animate } from "motion/react";
import { useAnimationStore } from "../store/animationStore";
import { useMediaQuery } from "./useMediaQuery";

type Snapshot = { node: HTMLElement; ancestors: HTMLElement[]; rect: DOMRect; scroll: { top: number; left: number }[] };
type Props = { transitionKey: string; enabled: boolean; direction: number; matchPageHighlights: boolean; hasPageHighlight: boolean };
type HighlightPosition = { index: number; left: number; width: number };
type PageSnapshot = { full: Snapshot; data: Snapshot | null; highlight: HighlightPosition | null; labels: string[]; bar: { node: HTMLElement; rect: DOMRect } | null };

function highlightPosition(page: HTMLElement): HighlightPosition | null {
  const navigation = page.querySelector<HTMLElement>(".navigation-highlight:not(.navigation-highlight-overlay .navigation-highlight)");
  if (!navigation) return null;
  const items = [...navigation.querySelectorAll<HTMLElement>(":scope > [data-highlight]")];
  const index = items.findIndex((item) => item.dataset.active === "true");
  if (index < 0) return null;
  const bounds = navigation.getBoundingClientRect();
  const selected = items[index].getBoundingClientRect();
  if (!bounds.width) return null;
  return { index, left: (selected.left - bounds.left) / bounds.width, width: selected.width / bounds.width };
}

function capture(element: HTMLElement): Snapshot {
  const node = element.cloneNode(true) as HTMLElement;
  const originals = [element, ...element.querySelectorAll<HTMLElement>("*")];
  const copies = [node, ...node.querySelectorAll<HTMLElement>("*")];
  originals.forEach((original, index) => {
    const copy = copies[index];
    if (original instanceof HTMLCanvasElement && copy instanceof HTMLCanvasElement) {
      copy.getContext("2d")?.drawImage(original, 0, 0);
    }
  });
  let background: HTMLElement | null = element;
  while (background && getComputedStyle(background).backgroundColor === "rgba(0, 0, 0, 0)") background = background.parentElement;
  node.style.backgroundColor = background ? getComputedStyle(background).backgroundColor : "Canvas";
  node.removeAttribute("id");
  node.querySelectorAll("[id]").forEach((child) => child.removeAttribute("id"));
  const ancestors: HTMLElement[] = [];
  for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const shell = parent.cloneNode(false) as HTMLElement;
    shell.removeAttribute("id");
    shell.style.setProperty("display", "contents", "important");
    ancestors.push(shell);
  }
  return { node, ancestors, rect: element.getBoundingClientRect(), scroll: originals.map((original) => ({ top: original.scrollTop, left: original.scrollLeft })) };
}

class PushSnapshot extends Component<Props> {
  private marker = createRef<HTMLSpanElement>();
  private animations: Animation[] = [];
  private overlay: HTMLElement | null = null;
  private highlightCleanup: (() => void) | null = null;
  private handoffCleanup: (() => void) | null = null;

  getSnapshotBeforeUpdate(previous: Props): PageSnapshot | null {
    if (previous.transitionKey === this.props.transitionKey || !previous.enabled || !this.props.enabled) return null;
    const element = this.marker.current?.parentElement;
    if (!element) return null;
    const data = this.props.matchPageHighlights && element.querySelector(".navigation-highlight-bar")
      ? element.querySelector<HTMLElement>("[data-push-page-content]") : null;
    const collapsed = window.matchMedia("(max-width: 767px)").matches && !!element.querySelector('.page-highlight[data-expanded="false"]');
    const bar = data && !collapsed ? element.querySelector<HTMLElement>(".page-highlight") : null;
    return { full: capture(element), data: data ? capture(data) : null, highlight: data ? highlightPosition(element) : null, labels: bar ? [...bar.querySelectorAll<HTMLElement>(".navigation-highlight:not(.navigation-highlight-overlay .navigation-highlight) [data-swap-label]")].map((label) => label.dataset.swapLabel ?? "") : [], bar: bar ? { node: bar.cloneNode(true) as HTMLElement, rect: bar.getBoundingClientRect() } : null };
  }

  componentDidUpdate(previous: Props, _state: unknown, snapshot: PageSnapshot | null) {
    if (!snapshot) return;
    this.clear();
    const page = this.marker.current?.parentElement;
    if (!page) return;
    if (previous.hasPageHighlight && this.props.hasPageHighlight && snapshot.bar && snapshot.data) {
      this.handoff(page, snapshot);
      return;
    }
    if (previous.hasPageHighlight && this.props.hasPageHighlight && snapshot.data && !snapshot.bar) {
      this.push(page, snapshot, page.querySelector<HTMLElement>("[data-push-page-content]"));
      return;
    }
    this.push(page, snapshot, null);
  }

  private handoff(page: HTMLElement, snapshot: PageSnapshot) {
    const { node: bridge, rect } = snapshot.bar!;
    bridge.dataset.highlightBridge = "true";
    bridge.setAttribute("aria-hidden", "true");
    bridge.inert = true;
    bridge.removeAttribute("id");
    bridge.querySelectorAll("[id]").forEach((child) => child.removeAttribute("id"));
    Object.assign(bridge.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: "0", pointerEvents: "none", zIndex: "2" });
    page.parentElement?.append(bridge);
    let hiddenBar: HTMLElement | null = null;
    let handoffBar: HTMLElement | null = null;
    let timer = 0;
    const observer = new MutationObserver(() => tryHandoff());
    const cleanup = () => {
      observer.disconnect();
      window.clearTimeout(timer);
      if (hiddenBar) hiddenBar.style.removeProperty("visibility");
      if (handoffBar) delete handoffBar.dataset.highlightHandoff;
      bridge.remove();
    };
    const tryHandoff = () => {
      const bar = page.querySelector<HTMLElement>(".navigation-highlight-bar");
      const data = page.querySelector<HTMLElement>("[data-push-page-content]");
      if (!bar || !data || !bar.getBoundingClientRect().width || !data.getBoundingClientRect().width) return;
      hiddenBar = bar;
      bar.style.visibility = "hidden";
      const indicator = bar.querySelector<HTMLElement>(".navigation-highlight__indicator");
      if (!indicator || !indicator.getBoundingClientRect().width) return;
      observer.disconnect();
      window.clearTimeout(timer);
      bar.dataset.highlightHandoff = "true";
      handoffBar = bar;
      if (snapshot.highlight) this.moveHighlight(page, snapshot.highlight);
      bar.dispatchEvent(new CustomEvent("highlight-text-handoff", { bubbles: true, detail: { labels: snapshot.labels } }));
      bar.dispatchEvent(new Event("highlight-text-handoff-primed", { bubbles: true }));
      bar.style.removeProperty("visibility");
      hiddenBar = null;
      bridge.remove();
      this.push(page, snapshot, data);
      timer = window.setTimeout(() => { delete bar.dataset.highlightHandoff; }, 900);
    };
    observer.observe(page, { childList: true, subtree: true });
    timer = window.setTimeout(cleanup, 3000);
    this.handoffCleanup = cleanup;
    tryHandoff();
  }

  private push(page: HTMLElement, snapshot: PageSnapshot, data: HTMLElement | null) {
    const element = data || page;
    const { node, ancestors, rect, scroll } = data && snapshot.data ? snapshot.data : snapshot.full;
    const clip = document.createElement("div");
    clip.dataset.pushTransition = "exit";
    clip.setAttribute("aria-hidden", "true");
    clip.inert = true;
    Object.assign(clip.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, overflow: "hidden", pointerEvents: "none", zIndex: "1" });
    Object.assign(node.style, { width: `${rect.width}px`, height: `${rect.height}px`, margin: "0", boxSizing: "border-box" });
    let parent: HTMLElement = clip;
    for (const ancestor of ancestors.reverse()) { parent.append(ancestor); parent = ancestor; }
    parent.append(node);
    const content = this.marker.current?.closest("#main-content");
    (data && content ? content : content?.parentElement ?? element.parentElement)?.append(clip);
    [node, ...node.querySelectorAll<HTMLElement>("*")].forEach((copy, index) => {
      copy.scrollTop = scroll[index].top;
      copy.scrollLeft = scroll[index].left;
    });

    this.overlay = clip;
    const options: KeyframeAnimationOptions = { duration: 500, easing: `cubic-bezier(${ease.inOut.join(",")})` };
    const incoming = element.animate([{ transform: `translateX(${this.props.direction * 100}%)` }, { transform: "translateX(0)" }], options);
    const outgoing = node.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-this.props.direction * 100}%)` }], options);
    this.animations = [incoming, outgoing];
    outgoing.finished.catch(() => {}).finally(() => {
      clip.remove();
      if (this.overlay === clip) this.overlay = null;
    });
  }

  private moveHighlight(page: HTMLElement, from: HighlightPosition) {
    const to = highlightPosition(page);
    if (!to || from.index === to.index) return;
    const navigation = page.querySelector<HTMLElement>(".navigation-highlight:not(.navigation-highlight-overlay .navigation-highlight)");
    if (!navigation) return;
    let controls: ReturnType<typeof animate> | undefined;
    let timeout = 0;
    const observer = new MutationObserver(() => start());
    const start = () => {
      const indicator = navigation.querySelector<HTMLElement>(".navigation-highlight__indicator");
      if (!indicator) return;
      observer.disconnect();
      window.clearTimeout(timeout);
      const width = navigation.getBoundingClientRect().width;
      const offset = (from.left - to.left) * width;
      const scale = from.width / to.width;
      indicator.style.transformOrigin = "left center";
      indicator.style.transform = `translateX(${offset}px) scaleX(${scale})`;
      controls = animate(indicator, { x: [offset, 0], scaleX: [scale, 1] }, motionTokens.spring.handoff);
    };
    observer.observe(navigation, { childList: true, subtree: true });
    timeout = window.setTimeout(() => observer.disconnect(), 1000);
    start();
    this.highlightCleanup = () => { observer.disconnect(); window.clearTimeout(timeout); controls?.stop(); };
  }

  componentWillUnmount() { this.clear(); }

  private clear() {
    this.handoffCleanup?.();
    this.handoffCleanup = null;
    this.highlightCleanup?.();
    this.highlightCleanup = null;
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
    this.overlay?.remove();
    this.overlay = null;
  }

  render() { return <span ref={this.marker} hidden />; }
}

export function PushTransition({ transitionKey, direction = 1, matchPageHighlights = false, hasPageHighlight = false }: { transitionKey: string; direction?: number; matchPageHighlights?: boolean; hasPageHighlight?: boolean }) {
  const enabled = useAnimationStore((state) => state.enabled);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  return <PushSnapshot transitionKey={transitionKey} direction={direction} enabled={enabled && !reduced} matchPageHighlights={matchPageHighlights} hasPageHighlight={hasPageHighlight} />;
}
