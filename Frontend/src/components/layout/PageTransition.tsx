import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { TargetAndTransition } from "motion/react";
import { AnimateView } from "motion/react-animate-view";
import type { PageTransitionEffect } from "../../utils/pageTransition";

type Effect = Exclude<PageTransitionEffect, "random">;

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
  children: ReactNode;
};

const SLIDE = 60;
const BANDS = 5;
const BAND_STAGGER = 0.12;
const BAND_FRAMES = 16;
const CLIP =
  ":root[data-page-transition]::view-transition-old(root){display:none}" +
  ":root[data-page-transition]::view-transition-new(root){animation:none}" +
  "::view-transition-group(*.page-transition){z-index:1}" +
  "::view-transition-group(app-sidebar){z-index:2}" +
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
  zoom: (_, enter, exit) => ({
    enter: {
      opacity: [0, 1],
      transform: ["scale(0.94)", "none"],
      transformOrigin: [middle(enter), middle(enter)],
      transition: { duration: 0.4, ease: "easeOut" },
    },
    exit: {
      opacity: [1, 0],
      transform: ["none", "scale(1.04)"],
      transformOrigin: [middle(exit), middle(exit)],
      transition: { duration: 0.2, ease: "easeIn" },
    },
  }),
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

function markRoot() {
  const root = document.documentElement;
  const mark = ++marks;
  root.setAttribute("data-page-transition", "");
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
      if (mark === marks) root.removeAttribute("data-page-transition");
    });
}

export function PageTransition({ effect, transitionKey, children }: PageTransitionProps) {
  const location = useLocation();
  const key = transitionKey ?? location.pathname;
  const reduce = usePrefersReducedMotion();
  const localRef = useRef<HTMLDivElement>(null);
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

  const animation = (types: string[]) => {
    markRoot();
    refreshStyle();
    const named = types.find((type): type is Effect => type in EFFECTS);
    const enter = frameOf(localRef.current!, pointRef.current);
    return EFFECTS[reduce ? "fade" : (named ?? effectRef.current)](
      types.includes("nav-back"),
      enter,
      exitRef.current ?? enter,
    );
  };

  return (
    <AnimateView
      key={key}
      enter={(types) => animation(types).enter}
      exit={(types) => animation(types).exit}
    >
      <div ref={localRef} className={`page-transition ${className}`}>
        <style>{CLIP}</style>
        <style ref={styleRef} />
        {children}
      </div>
    </AnimateView>
  );
}
