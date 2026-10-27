import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  motionTokens,
  toCssTiming,
  useShouldReduceMotion,
  useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { useTheme } from "../../context/ThemeContext";
import { useLocale } from "../../context/LocaleContext";

export function ThemeTogglerButton({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const changing = useRef(false);
  const [busy, setBusy] = useState(false);
  const transition = useTempoTransition(motionTokens.transition.spin);
  const slideTiming = toCssTiming(useTempoTransition(motionTokens.transition.collapse));
  const pressTransition = useTempoTransition({
    type: "spring",
    stiffness: 550,
    damping: 30,
    restSpeed: 10,
  });

  const toggleTheme = async () => {
    if (changing.current) return;
    const nextTheme = theme === "dark" ? "light" : "dark";
    if (shouldReduceMotion || !document.startViewTransition || document.visibilityState === "hidden") {
      setTheme(nextTheme);
      return;
    }

    changing.current = true;
    setBusy(true);
    const root = document.documentElement;
    root.setAttribute("data-theme-transition", "");
    try {
      const viewTransition = document.startViewTransition(() => {
        flushSync(() => setTheme(nextTheme));
      });
      await viewTransition.ready;
      await root.animate(
        { clipPath: ["inset(0 100% 0 0)", "inset(0 0 0 0)"] },
        {
          duration: slideTiming.duration,
          easing: slideTiming.easing,
          pseudoElement: "::view-transition-new(root)",
        },
      ).finished;
    } catch (error) {
      console.warn("Theme transition interrupted; applying the selected theme.", error);
      setTheme(nextTheme);
    } finally {
      root.removeAttribute("data-theme-transition");
      changing.current = false;
      setBusy(false);
    }
  };

  return (
    <motion.button
      type="button"
      className={`theme-toggler${className ? ` ${className}` : ""}`}
      data-theme={theme}
      aria-label={t("Toggle theme")}
      aria-pressed={theme === "dark"}
      aria-busy={busy}
      disabled={busy}
      title={t("Switch to {theme} theme", { theme: t(theme === "dark" ? "light" : "dark") })}
      onClick={toggleTheme}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={pressTransition}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={theme}
          className="theme-toggler__icon"
          aria-hidden="true"
          initial={
            shouldReduceMotion
              ? { opacity: 0, filter: "blur(2px)" }
              : { opacity: 0, scale: 0.5, filter: "blur(2px)", rotate: -90 }
          }
          animate={
            shouldReduceMotion
              ? { opacity: 1, filter: "blur(0px)" }
              : { opacity: 1, scale: 1, filter: "blur(0px)", rotate: 0 }
          }
          exit={
            shouldReduceMotion
              ? { opacity: 0, filter: "blur(2px)" }
              : { opacity: 0, scale: 0.5, filter: "blur(2px)", rotate: 90 }
          }
          transition={transition}
        >
          {theme === "dark" ? <MoonIcon /> : <SunIcon />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
    </svg>
  );
}
