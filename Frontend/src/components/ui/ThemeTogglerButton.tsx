import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { motion } from "motion/react";
import {
  useShouldReduceMotion,
  useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { Moon } from "../animate-ui/icons/moon";
import { Sun } from "../animate-ui/icons/sun";
import { AnimateIcon } from "../animate-ui/icons/icon";
import { useTheme } from "../../context/ThemeContext";
import { useLocale } from "../../context/LocaleContext";
import { fullPageTransition } from "../layout/PageTransition";
import { readPageTransitionEffect } from "../../utils/pageTransition";
import { useAnimationStore } from "../../store/animationStore";

export function ThemeTogglerButton({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const changing = useRef(false);
  const [busy, setBusy] = useState(false);
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const pressTransition = useTempoTransition({
    type: "spring",
    stiffness: 550,
    damping: 30,
    restSpeed: 10,
  });

  const toggleTheme = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (changing.current) return;
    const nextTheme = theme === "dark" ? "light" : "dark";
    if (shouldReduceMotion || !animationsEnabled || !document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }
    changing.current = true;
    setBusy(true);
    const root = document.documentElement;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const { enter } = fullPageTransition(readPageTransitionEffect(), point);
    root.setAttribute("data-theme-transition", "");
    let applied = false;
    const mapCovers: HTMLElement[] = [];
    const rootAnimations: Animation[] = [];
    try {
      const transition = document.startViewTransition(() => {
        flushSync(() => setTheme(nextTheme));
        applied = true;
        document.querySelectorAll<HTMLElement>(".mapboxgl-map:has(.mapboxgl-canvas)").forEach((map) => {
          const cover = document.createElement("div");
          cover.setAttribute("aria-hidden", "true");
          Object.assign(cover.style, {
            position: "absolute",
            inset: "0",
            zIndex: "2147483647",
            background: "var(--bg)",
            pointerEvents: "none",
          });
          map.append(cover);
          mapCovers.push(cover);
        });
      });
      await transition.ready;
      const animate = (effect: typeof enter, pseudoElement: string) => {
        const { transition: timing, ...keyframes } = effect;
        const options = timing as { duration?: number; ease?: string } | undefined;
        const easing = options?.ease === "easeInOut" ? "ease-in-out" : options?.ease === "easeIn" ? "ease-in" : options?.ease === "linear" ? "linear" : "ease-out";
        const animation = root.animate(keyframes as unknown as PropertyIndexedKeyframes, {
          duration: (options?.duration ?? 0.3) * 1000,
          easing,
          fill: "both",
          pseudoElement,
        });
        rootAnimations.push(animation);
        return animation.finished;
      };
      const duration = ((enter.transition as { duration?: number } | undefined)?.duration ?? 0.3) * 1000;
      const animations = [animate(enter, "::view-transition-new(root)"), ...mapCovers.map((cover) =>
        cover.animate({ opacity: [1, 0] }, { duration, easing: "ease-in-out", fill: "both" }).finished,
      )];
      await Promise.all(animations);
      await transition.finished;
    } catch {
      if (!applied) setTheme(nextTheme);
    } finally {
      rootAnimations.forEach((animation) => animation.cancel());
      mapCovers.forEach((cover) => cover.remove());
      root.removeAttribute("data-theme-transition");
      changing.current = false;
      setBusy(false);
    }
  };

  return (
    <AnimateIcon asChild speed={2}>
      <motion.button
        type="button"
        className={`theme-toggler${className ? ` ${className}` : ""}`}
        data-theme={theme}
        aria-label={t("Toggle theme")}
        aria-pressed={theme === "dark"}
        disabled={busy}
        title={t("Switch to {theme} theme", { theme: t(theme === "dark" ? "light" : "dark") })}
        onClick={toggleTheme}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
        transition={pressTransition}
      >
        <span key={theme} className="theme-toggler__icon" aria-hidden="true">
          {theme === "dark" ? (
            <Moon size={18} fill="currentColor" />
          ) : (
            <Sun size={18} fill="currentColor" />
          )}
        </span>
      </motion.button>
    </AnimateIcon>
  );
}
