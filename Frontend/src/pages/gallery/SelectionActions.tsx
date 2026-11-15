import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useSelectionActionState } from "./useSelectionActionState";

function Actions({ children, vertical }: { children: ReactNode; vertical: boolean }) {
  const { isPresent, duration } = useSelectionActionState();

  return (
    <motion.div
      className="gallery-selection-bar__selection-actions"
      initial={vertical ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
      animate={vertical ? { height: "auto", opacity: 1 } : { width: "auto", opacity: 1 }}
      exit={vertical ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
      transition={{ duration, ease: "easeOut" }}
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
