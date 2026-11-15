import { useContext, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ActionBarContext, usePageActionBarProvider } from "./PageActionBarCore";

export { cloneMobileSearchFooter, usePageActionBarFooter } from "./PageActionBarCore";

export function PageActionBarProvider({ children }: { children: ReactNode }) {
  const { target, setTarget, width, enabled, reducedMotion, onAnimationComplete } = usePageActionBarProvider();
  return <ActionBarContext.Provider value={target}>
    {children}
    <footer className="gallery-page__footer page-action-bar">
      <motion.div className="page-action-bar__item" animate={{ width, opacity: width > 0 ? 1 : 0 }}
        transition={{ duration: enabled && !reducedMotion ? 0.2 : 0, ease: "easeOut" }}
        onAnimationComplete={onAnimationComplete}
        ref={setTarget} />
    </footer>
  </ActionBarContext.Provider>;
}

export function PageActionBar({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  const target = useContext(ActionBarContext);
  const bar = <div {...props} className={`gallery-selection-bar gallery-selection-bar--compact ${className}`} />;
  return target ? createPortal(bar, target) : null;
}
