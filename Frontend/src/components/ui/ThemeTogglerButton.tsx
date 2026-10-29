import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { motion } from "motion/react";
import {
  motionTokens,
  toCssTiming,
  useShouldReduceMotion,
  useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { Moon } from "../animate-ui/icons/moon";
import { Sun } from "../animate-ui/icons/sun";
import { useTheme } from "../../context/ThemeContext";
import { useLocale } from "../../context/LocaleContext";

export function ThemeTogglerButton({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const changing = useRef(false);
  const [busy, setBusy] = useState(false);
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
      aria-label={t("Switch to {theme} theme", { theme: t(theme === "dark" ? "light" : "dark") })}
      aria-pressed={theme === "dark"}
      aria-busy={busy}
      disabled={busy}
      title={t("Switch to {theme} theme", { theme: t(theme === "dark" ? "light" : "dark") })}
      onClick={toggleTheme}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={pressTransition}
    >
      <span key={theme} className="theme-toggler__icon" aria-hidden="true">
        {theme === "dark" ? (
          <Moon size={18} fill="currentColor" animate animateOnHover animateOnTap />
        ) : (
          <Sun size={18} fill="currentColor" animate animateOnHover animateOnTap />
        )}
      </span>
    </motion.button>
  );
}
