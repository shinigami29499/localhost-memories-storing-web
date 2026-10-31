import { useRef, useState } from "react";
import { motion } from "motion/react";
import {
  motionTokens,
  toCssTiming,
  useShouldReduceMotion,
  useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { Moon } from "../animate-ui/icons/moon";
import { Sun } from "../animate-ui/icons/sun";
import { AnimateIcon } from "../animate-ui/icons/icon";
import { useTheme } from "../../context/ThemeContext";
import { useLocale } from "../../context/LocaleContext";

export function ThemeTogglerButton({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const changing = useRef(false);
  const pressTransition = useTempoTransition({
    type: "spring",
    stiffness: 550,
    damping: 30,
    restSpeed: 10,
  });

  const toggleTheme = () => {
    if (changing.current) return;
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <AnimateIcon asChild>
      <motion.button
        type="button"
        className={`theme-toggler${className ? ` ${className}` : ""}`}
        data-theme={theme}
        aria-label={t("Toggle theme")}
        aria-pressed={theme === "dark"}
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
