import { useAnimationStore } from "../../store/animationStore";
import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, startTransition, ViewTransition } from "react";
import { Spinner } from "../ui";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { TargetAndTransition } from "motion/react";
import { AnimateView } from "motion/react-animate-view";
import type { PageTransitionEffect } from "../../utils/pageTransition";

type Effect = Exclude<PageTransitionEffect, "random">;

const PageTransitionLoadingContext = createContext(false);

export function usePageTransitionLoading() {
  return useContext(PageTransitionLoadingContext);
}

type Frame = {
  width: number;
  top: number;
  bottom: number;
  x: number;
  y: number;
};

type EffectAnimation = {
  enter: TargetAndTransition;
  exit: TargetAndTransition;
};

type PageTransitionProps = {
  effect: PageTransitionEffect;
  transitionKey?: string;
  skipUpdates?: boolean;
  liveRoot?: boolean;
  deferRendering?: boolean;
  scope?: "page" | "section";
  loading?: boolean;
  children: ReactNode;
};

const SLIDE = 60;
const BANDS = 5;
const BAND_STAGGER = 0.12;
const BAND_FRAMES = 16;
const LOADING_LABEL_DELAY_MS = 300;
const LOADING_LABEL_MIN_MS = 500;
const CLIP =
  ":root[data-page-transition]::view-transition-old(root){display:none}" +
  ":root[data-page-transition]::view-transition-new(root){animation:none}" +
  ":root[data-page-transition-live-root]::view-transition-new(root){display:none}" +
  "::view-transition-group(*.page-transition){z-index:1;animation:none}" +
  "::view-transition-group(app-sidebar){z-index:2}" +
  "::view-transition-group(app-sidebar-toggle){z-index:3}" +
  ":root[data-page-transition]::view-transition-old(app-sidebar-toggle){display:none}" +
  ":root[data-page-transition]::view-transition-new(app-sidebar-toggle){animation:none}" +
  "::view-transition-group(app-topbar){z-index:2}" +
  ":root[data-page-transition]::view-transition-old(app-topbar){display:none}" +
  ":root[data-page-transition]::view-transition-new(app-topbar){animation:none}" +
  ":root[data-page-transition]::view-transition-old(app-sidebar){display:none}" +
  ":root[data-page-transition]::view-transition-new(app-sidebar){animation:none}" +
  "::view-transition-image-pair(*.page-transition){overflow:clip}";

const still = (duration: number): TargetAndTransition => ({
  transform: ["none", "none"],
  transition: { duration },
});

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function bandFrames(back: boolean, { top, bottom }: Frame) {
  const span = 1 - (BANDS - 1) * BAND_STAGGER;
  return Array.from({ length: BAND_FRAMES + 1 }, (_, frame) => {
    const t = frame / BAND_FRAMES;
    const points: string[] = [];
    for (let band = 0; band < BANDS; band++) {
      const progress = easeOutCubic(
        Math.min(1, Math.max(0, (t - band * BAND_STAGGER) / span)),
      );
      const edge = back ? 100 : 0;
      const reach = back ? 100 - progress * 100 : progress * 100;
      const from = top + ((bottom - top) * band) / BANDS;
      const to = top + ((bottom - top) * (band + 1)) / BANDS;
      points.push(
        `${edge}% ${from}px`,
        `${reach}% ${from}px`,
        `${reach}% ${to}px`,
        `${edge}% ${to}px`,
      );
    }
    return `polygon(${points.join(", ")})`;
  });
}

const middle = ({ top, bottom }: Frame) => `50% ${(top + bottom) / 2}px`;

const EFFECTS: Record<
  Effect,
  (back: boolean, enter: Frame, exit: Frame) => EffectAnimation
> = {
  fade: () => ({
    enter: {
      opacity: [0, 1],
      filter: ["blur(8px)", "blur(0px)"],
      transition: { duration: 0.3, ease: "easeOut" },
    },
    exit: {
      opacity: [1, 0],
      filter: ["blur(0px)", "blur(8px)"],
      transition: { duration: 0.15, ease: "easeIn" },
    },
  }),
  slide: (back) => {
    const from = back ? -SLIDE : SLIDE;
    return {
      enter: {
        opacity: [0, 1],
        transform: [`translateX(${from}px)`, "none"],
        transition: { duration: 0.4, ease: "easeOut" },
      },
      exit: {
        opacity: [1, 0],
        transform: ["none", `translateX(${-from}px)`],
        transition: { duration: 0.2, ease: "easeIn" },
      },
    };
  },
  push: (back) => {
    const from = back ? -100 : 100;
    return {
      enter: {
        transform: [`translateX(${from}%)`, "none"],
        transition: { duration: 0.5, ease: "easeInOut" },
      },
      exit: {
        transform: ["none", `translateX(${-from}%)`],
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    };
  },
  iris: (_, { width, top, bottom, x, y }) => {
    const radius = Math.hypot(
      Math.max(x, width - x),
      Math.max(y - top, bottom - y),
    );
    return {
      enter: {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`,
        ],
        transition: { duration: 0.6, ease: "easeInOut" },
      },
      exit: still(0.6),
    };
  },
  wipe: (back) => ({
    enter: {
      clipPath: [back ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)", "inset(0)"],
      transition: { duration: 0.5, ease: "easeInOut" },
    },
    exit: {
      transform: ["none", `translateX(${back ? 8 : -8}%)`],
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  }),
  bands: (back, enter) => ({
    enter: {
      clipPath: bandFrames(back, enter),
      transition: { duration: 0.7, ease: "linear" },
    },
    exit: still(0.7),
  }),
  stack: (back, enter, exit) => {
    const distance = enter.bottom - enter.top;
    return {
      enter: {
        transform: [`translateY(${back ? -distance : distance}px)`, "none"],
        transition: { duration: 0.5, ease: "easeInOut" },
      },
      exit: {
        transform: ["none", "scale(0.94)"],
        transformOrigin: [middle(exit), middle(exit)],
        opacity: [1, 0.6],
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    };
  },
  flow: (back) => {
    const from = back ? -30 : 30;
    return {
      enter: {
        opacity: [0, 1],
        transform: [`translateX(${from}%)`, "none"],
        filter: ["blur(12px)", "blur(0px)"],
        transition: { duration: 0.35, ease: "easeOut" },
      },
      exit: {
        opacity: [1, 0],
        transform: ["none", `translateX(${-from}%)`],
        filter: ["blur(0px)", "blur(12px)"],
        transition: { duration: 0.25, ease: "easeIn" },
      },
    };
  },
  chop: (back, { top, bottom }) => ({
    enter: {
      clipPath: back
        ? [
            `polygon(0% ${top}px, -20% ${top}px, 0% ${bottom}px, 0% ${bottom}px)`,
            `polygon(0% ${top}px, 120% ${top}px, 100% ${bottom}px, 0% ${bottom}px)`,
          ]
        : [
            `polygon(100% ${top}px, 100% ${top}px, 100% ${bottom}px, 120% ${bottom}px)`,
            `polygon(-20% ${top}px, 100% ${top}px, 100% ${bottom}px, 0% ${bottom}px)`,
          ],
      transition: { duration: 0.55, ease: "easeInOut" },
    },
    exit: {
      transform: ["none", `translateX(${back ? 6 : -6}%)`],
      transition: { duration: 0.55, ease: "easeInOut" },
    },
  }),
};

function pickEffect(previous?: Effect): Effect {
  const choices = (Object.keys(EFFECTS) as Effect[]).filter(
    (name) => name !== previous,
  );
  return choices[Math.floor(Math.random() * choices.length)]!;
}

function frameOf(element: HTMLElement, point?: { x: number; y: number }): Frame {
  const rect = element.getBoundingClientRect();
  const top = Math.min(Math.max(0, -rect.top), rect.height);
  const bottom = Math.max(top, Math.min(rect.height, window.innerHeight - rect.top));
  return {
    width: rect.width,
    top,
    bottom,
    x: point ? point.x - rect.left : rect.width / 2,
    y: point ? point.y - rect.top : (top + bottom) / 2,
  };
}

export function mediaViewerTransition(element: HTMLElement, effect: PageTransitionEffect, reduced: boolean) {
  const selected = reduced ? "fade" : effect === "random" ? pickEffect() : effect;
  const frame = frameOf(element);
  return EFFECTS[selected](false, frame, frame);
}

export function fullPageTransition(effect: PageTransitionEffect, point: { x: number; y: number }) {
  const selected = effect === "random" ? pickEffect() : effect;
  const frame = { width: window.innerWidth, top: 0, bottom: window.innerHeight, ...point };
  return EFFECTS[selected](false, frame, frame);
}

function backgroundOf(element: HTMLElement) {
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    const color = getComputedStyle(node).backgroundColor;
    if (color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color)) {
      return color;
    }
  }
  return "canvas";
}

function clipRadius(element: HTMLElement) {
  const own = getComputedStyle(element).borderRadius;
  if (own !== "0px") return own;
  let parent = element.parentElement;
  while (parent && getComputedStyle(parent).overflow === "visible") {
    parent = parent.parentElement;
  }
  if (!parent) return "0px";
  const style = getComputedStyle(parent);
  const outer = parent.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const top = parseFloat(style.borderTopWidth);
  const right = parseFloat(style.borderRightWidth);
  const bottom = parseFloat(style.borderBottomWidth);
  const left = parseFloat(style.borderLeftWidth);
  const touches = {
    top: rect.top - (outer.top + top) < 1,
    right: outer.right - right - rect.right < 1,
    bottom: outer.bottom - bottom - rect.bottom < 1,
    left: rect.left - (outer.left + left) < 1,
  };
  const corner = (radius: string, a: boolean, b: boolean, border: number) =>
    a && b ? `${Math.max(0, parseFloat(radius) - border)}px` : "0px";
  return [
    corner(style.borderTopLeftRadius, touches.top, touches.left, Math.max(top, left)),
    corner(style.borderTopRightRadius, touches.top, touches.right, Math.max(top, right)),
    corner(style.borderBottomRightRadius, touches.bottom, touches.right, Math.max(bottom, right)),
    corner(style.borderBottomLeftRadius, touches.bottom, touches.left, Math.max(bottom, left)),
  ].join(" ");
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

type DocumentWithViewTransition = Document & {
  activeViewTransition?: { finished: Promise<unknown> } | null;
};

let marks = 0;

function markRoot(liveRoot = false) {
  const root = document.documentElement;
  const mark = ++marks;
  root.setAttribute("data-page-transition", "");
  if (liveRoot) root.setAttribute("data-page-transition-live-root", "");
  else root.removeAttribute("data-page-transition-live-root");
  const transition = (document as DocumentWithViewTransition).activeViewTransition;
  const done = transition
    ? transition.finished
    : new Promise<void>((resolve) => requestAnimationFrame(() => resolve())).then(() =>
        Promise.all(
          root
            .getAnimations({ subtree: true })
            .filter((animation) =>
              (animation.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
                "::view-transition",
              ),
            )
            .map((animation) => animation.finished),
        ),
      );
  void done
    .catch(() => undefined)
    .finally(() => {
      if (mark === marks) {
        root.removeAttribute("data-page-transition");
        root.removeAttribute("data-page-transition-live-root");
      }
    });
}

function positionSectionOverlay(section: HTMLElement, overlay: HTMLElement) {
  const bounds = section.getBoundingClientRect();
  overlay.style.setProperty("--loading-section-top", `${Math.max(0, bounds.top)}px`);
  overlay.style.setProperty("--loading-section-left", `${bounds.left}px`);
  overlay.style.setProperty("--loading-section-width", `${bounds.width}px`);
  const rect = overlay.getBoundingClientRect();
  const center = (Math.max(0, rect.top) + Math.min(window.innerHeight, rect.bottom)) / 2;
  overlay.style.setProperty("--loading-center-y", `${Math.max(0, center - rect.top)}px`);
}

export function PageTransition({ effect, transitionKey, skipUpdates = false, liveRoot = false, deferRendering = true, scope = "section", loading = false, children }: PageTransitionProps) {
  const parentLoading = usePageTransitionLoading();
  const location = useLocation();
  const key = transitionKey ?? location.pathname;
  const [renderState, setRenderState] = useState({ key, ready: false, labelVisible: false });
  if (renderState.key !== key) setRenderState({ key, ready: false, labelVisible: false });
  const contentReady = renderState.key === key && renderState.ready;
  const labelVisible = renderState.key === key && renderState.labelVisible;
  const loadingTimingRef = useRef({ key, startedAt: 0, labelShownAt: null as number | null });
  useLayoutEffect(() => {
    if (loadingTimingRef.current.key !== key || !loadingTimingRef.current.startedAt) {
      loadingTimingRef.current = { key, startedAt: performance.now(), labelShownAt: null };
    }
    if (labelVisible && loadingTimingRef.current.labelShownAt === null) {
      loadingTimingRef.current.labelShownAt = performance.now();
    }
  }, [key, labelVisible]);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const committedRef = useRef({ key, contentReady });
  const swapping = committedRef.current.key !== key || committedRef.current.contentReady !== contentReady;
  useLayoutEffect(() => { committedRef.current = { key, contentReady }; });

  useEffect(() => {
    if (contentReady) return;
    let cancelled = false;
    let frame = 0;
    let previous = "";
    let stableFrames = 0;
    let frames = 0;
    let pageFinished = false;
    const wait = () => {
      if (localRef.current && overlayRef.current && scope === "section") {
        positionSectionOverlay(localRef.current, overlayRef.current);
      }
      const pending = loading || Boolean(contentRef.current?.querySelector('.spinner, [data-transition-loading="true"]'));
      const highlights = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="motion-highlight"]'));
      const styles = highlights.map((element) => element.getAttribute("style") ?? "").join("|");
      const moving = highlights.some((element) => element.getAnimations().some((animation) =>
        animation.playState === "running" && animation.effect?.getTiming().iterations !== Infinity,
      ));
      const pageMoving = document.getAnimations().some((animation) =>
        animation.playState === "running"
        && (animation.effect as KeyframeEffect | null)?.pseudoElement?.startsWith("::view-transition"),
      );
      stableFrames = styles === previous && !moving ? stableFrames + 1 : 0;
      previous = styles;
      // Allow highlight bounds effects to start before checking for settled motion.
      const settled = ++frames > 2 && stableFrames >= 3 && pageFinished && !pageMoving && !pending;
      const now = performance.now();
      const timing = loadingTimingRef.current;
      const labelFinished = timing.labelShownAt === null || now - timing.labelShownAt >= LOADING_LABEL_MIN_MS;
      if (settled && labelFinished) {
        if (!cancelled) {
          const reveal = () => setRenderState({ key, ready: true, labelVisible: false });
          if (parentLoading) reveal();
          else startTransition(reveal);
        }
      } else if (!cancelled) {
        if (!parentLoading && !settled && pageFinished && !pageMoving && !labelVisible && now - timing.startedAt >= LOADING_LABEL_DELAY_MS) {
          setRenderState((current) => current.key === key && !current.ready
            ? { ...current, labelVisible: true } : current);
        }
        frame = requestAnimationFrame(wait);
      }
    };
    frame = requestAnimationFrame(() => {
      const transition = (document as DocumentWithViewTransition).activeViewTransition;
      void (transition?.finished ?? Promise.resolve()).catch(() => undefined).then(() => {
        pageFinished = true;
      });
      wait();
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [key, contentReady, loading, scope, labelVisible, parentLoading]);
  const currentKeyRef = useRef(key);
  const hasChangedRef = useRef(false);
  if (currentKeyRef.current !== key) {
    currentKeyRef.current = key;
    hasChangedRef.current = true;
  }
  const reduce = usePrefersReducedMotion();
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const localRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (scope === "section" && !contentReady && localRef.current && overlayRef.current) {
      positionSectionOverlay(localRef.current, overlayRef.current);
    }
  }, [scope, contentReady, key]);
  useLayoutEffect(() => {
    if (scope !== "page" || contentReady) return;
    const overlay = overlayRef.current;
    const main = localRef.current?.closest<HTMLElement>(".app-shell__main");
    if (!overlay || !main) return;
    const updateBounds = () => {
      const rect = main.getBoundingClientRect();
      overlay.style.left = `${Math.max(0, rect.left)}px`;
      overlay.style.right = `${Math.max(0, window.innerWidth - rect.right)}px`;
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(main);
    window.addEventListener("resize", updateBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, [scope, contentReady, key]);
  const styleRef = useRef<HTMLStyleElement>(null);
  const pointRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const exitRef = useRef<Frame | undefined>(undefined);
  const effectRef = useRef<Effect>("fade");
  const id = useId();
  const className = `page-transition-${id.replace(/[^a-z0-9]/gi, "")}`;

  useLayoutEffect(() => {
    effectRef.current = effect === "random" ? pickEffect(effectRef.current) : effect;
  }, [effect, key]);

  const refreshStyle = () => {
    if (!localRef.current || !styleRef.current) return;
    styleRef.current.textContent =
      `.${className}{view-transition-class:page-transition ${className}}` +
      `::view-transition-image-pair(*.${className}){border-radius:${clipRadius(localRef.current)}}` +
      `::view-transition-old(*.${className}),::view-transition-new(*.${className}){background-color:${backgroundOf(localRef.current)}}`;
  };

  useLayoutEffect(refreshStyle);

  useEffect(() => {
    const onInput = (event: Event) => {
      if (!localRef.current) return;
      pointRef.current =
        event instanceof PointerEvent
          ? { x: event.clientX, y: event.clientY }
          : undefined;
      exitRef.current = frameOf(localRef.current, pointRef.current);
    };
    document.addEventListener("pointerdown", onInput, true);
    document.addEventListener("keydown", onInput, true);
    return () => {
      document.removeEventListener("pointerdown", onInput, true);
      document.removeEventListener("keydown", onInput, true);
    };
  }, []);

  const animation = (types: string[], outgoing = false) => {
    markRoot(liveRoot);
    refreshStyle();
    const named = types.find((type): type is Effect => type in EFFECTS);
    const enter = outgoing && exitRef.current ? exitRef.current : localRef.current
      ? frameOf(localRef.current, pointRef.current)
      : exitRef.current ?? { width: window.innerWidth, top: 0, bottom: window.innerHeight, x: window.innerWidth / 2, y: window.innerHeight / 2 };
    return EFFECTS[reduce || !animationsEnabled ? "fade" : (named ?? effectRef.current)](
      types.includes("nav-back"),
      enter,
      exitRef.current ?? enter,
    );
  };

  if (skipUpdates) {
    const animateLayer = (name: string, types: string[], entering: boolean) => {
      if (parentLoading) return () => {};
      const effects = animation(types, !entering);
      // Reveal effects must animate the old snapshot while destination rendering is deferred.
      const definition = !entering && deferRendering && Array.isArray(effects.enter.clipPath)
        ? { ...effects.enter, clipPath: [...effects.enter.clipPath].reverse() }
        : effects[entering ? "enter" : "exit"];
      const { transition, ...keyframes } = definition;
      const pseudoElement = `::view-transition-${entering ? "new" : "old"}(${name})`;
      for (const running of document.getAnimations()) {
        if (running.effect instanceof KeyframeEffect && running.effect.pseudoElement === pseudoElement) running.cancel();
      }
      const timing = transition && "duration" in transition ? transition.duration : undefined;
      const duration = reduce || !animationsEnabled ? 0 : typeof timing === "number" ? timing * 1000 : 300;
      const ease = transition && "ease" in transition ? transition.ease : undefined;
      const easing = ease === "linear" ? "linear" : ease === "easeIn" ? "ease-in" : ease === "easeOut" ? "ease-out" : "ease-in-out";
      const player = document.documentElement.animate(keyframes as PropertyIndexedKeyframes, { duration, easing, fill: "both", pseudoElement });
      return () => player.cancel();
    };
    return (
      <ViewTransition enter={parentLoading ? "none" : undefined} exit={parentLoading ? "none" : undefined} update={swapping && !parentLoading ? undefined : "none"} onEnter={({ name }, types) => animateLayer(name, types, true)} onExit={({ name }, types) => animateLayer(name, types, false)} onUpdate={({ name }, types) => {
        const cancelExit = animateLayer(name, types, false);
        const cancelEnter = animateLayer(name, types, true);
        return () => { cancelExit(); cancelEnter(); };
      }}>
        <div ref={localRef} className={`page-transition ${className}`} data-transition-loading={!contentReady ? "true" : undefined}>
          <style>{CLIP}</style>
          <style ref={styleRef} />
          <div ref={contentRef} className="page-transition__content" inert={!contentReady} aria-hidden={!contentReady || undefined} style={{ visibility: contentReady ? undefined : "hidden" }}><PageTransitionLoadingContext.Provider value={parentLoading || !contentReady}>{children}</PageTransitionLoadingContext.Provider></div>
          {!contentReady ? <div ref={overlayRef} className={`page-transition__loading page-transition__loading--${scope}`}>{labelVisible ? <Spinner /> : null}</div> : null}
        </div>
      </ViewTransition>
    );
  }

  return (
    <AnimateView
      enter={(types) => parentLoading || transitionKey !== undefined && !hasChangedRef.current ? still(0) : animation(types).enter}
      exit={(types) => parentLoading || transitionKey !== undefined && currentKeyRef.current === key ? still(0) : animation(types).exit}
    >
      <div ref={localRef} className={`page-transition ${className}`} data-transition-loading={!contentReady ? "true" : undefined}>
        <style>{CLIP}</style>
        <style ref={styleRef} />
        <div ref={contentRef} className="page-transition__content" inert={!contentReady} aria-hidden={!contentReady || undefined} style={{ visibility: contentReady ? undefined : "hidden" }}><PageTransitionLoadingContext.Provider value={parentLoading || !contentReady}>{children}</PageTransitionLoadingContext.Provider></div>
        {!contentReady ? <div ref={overlayRef} className={`page-transition__loading page-transition__loading--${scope}`}>{labelVisible ? <Spinner /> : null}</div> : null}
      </div>
    </AnimateView>
  );
}
