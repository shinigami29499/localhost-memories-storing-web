import { useRef, type Key, type ReactNode } from "react";
import { AnimateView } from "motion/react-animate-view";
import type { TargetAndTransition } from "motion/react";
import { useLocation } from "react-router-dom";
import { ease, useShouldReduceMotion } from "@animate-ui/react/utils/motion";

type PageStackTransitionProps = {
  children: ReactNode;
  pageKey?: Key;
};

type PageAnimation = {
  enter: TargetAndTransition;
  exit: TargetAndTransition;
};

let transitionMarks = 0;

function markPageTransition() {
  const root = document.documentElement;
  const mark = ++transitionMarks;
  root.setAttribute("data-page-transition", "");
  const transition = (
    document as Document & {
      activeViewTransition?: { finished: Promise<unknown> } | null;
    }
  ).activeViewTransition;
  const done = transition
    ? transition.finished
    : new Promise<void>((resolve) => requestAnimationFrame(() => resolve())).then(
        () =>
          Promise.all(
            root
              .getAnimations({ subtree: true })
              .filter((animation) =>
                (
                  animation.effect as KeyframeEffect | null
                )?.pseudoElement?.startsWith("::view-transition"),
              )
              .map((animation) => animation.finished),
          ),
      );

  void done
    .catch(() => {})
    .finally(() => {
      if (mark === transitionMarks) root.removeAttribute("data-page-transition");
    });
}

export function PageStackTransition({
  children,
  pageKey,
}: PageStackTransitionProps) {
  const { pathname } = useLocation();
  const key = pageKey ?? pathname;
  const shouldReduceMotion = useShouldReduceMotion();
  const localRef = useRef<HTMLDivElement>(null);

  const animation = (): PageAnimation => {
    markPageTransition();
    const rect = localRef.current?.getBoundingClientRect();
    const top = rect ? Math.min(Math.max(0, -rect.top), rect.height) : 0;
    const bottom = rect
      ? Math.max(top, Math.min(rect.height, window.innerHeight - rect.top))
      : window.innerHeight;
    const middle = `50% ${(top + bottom) / 2}px`;

    if (shouldReduceMotion) {
      return {
        enter: {
          opacity: [0, 1],
          transition: { duration: 0.3, ease: ease.out },
        },
        exit: {
          opacity: [1, 0],
          transition: { duration: 0.15, ease: ease.leave },
        },
      };
    }

    return {
      enter: {
        transform: [`translateY(${bottom - top}px)`, "none"],
        transition: { duration: 0.5, ease: ease.resize },
      },
      exit: {
        transform: ["none", "scale(0.94)"],
        transformOrigin: [middle, middle],
        opacity: [1, 0.6],
        transition: { duration: 0.5, ease: ease.resize },
      },
    };
  };

  return (
    <AnimateView
      key={key}
      enter={() => animation().enter}
      exit={() => animation().exit}
    >
      <div
        ref={localRef}
        data-slot="page-transition"
        style={{ viewTransitionClass: "page-stack-transition" }}
      >
        {children}
      </div>
    </AnimateView>
  );
}
