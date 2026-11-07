import type { ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useAnimationStore } from "../../store/animationStore";

function Actions({ children, vertical }: { children: ReactNode; vertical: boolean }) {
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = useAnimationStore((state) => state.enabled);

  return (
    <motion.div
      className="gallery-selection-bar__selection-actions"
      initial={vertical ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
      animate={vertical ? { height: "auto", opacity: 1 } : { width: "auto", opacity: 1 }}
      exit={vertical ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
      transition={{ duration: animationsEnabled && !reducedMotion ? 0.2 : 0, ease: "easeOut" }}
      inert={!isPresent}
      aria-hidden={!isPresent || undefined}
    >
      {children}
    </motion.div>
  );
}

export function SelectionActions({ open, children, mobileVertical = false }: { open: boolean; children: ReactNode; mobileVertical?: boolean }) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  return <AnimatePresence initial={false}>{open && <Actions vertical={mobileVertical && isMobile}>{children}</Actions>}</AnimatePresence>;
}
