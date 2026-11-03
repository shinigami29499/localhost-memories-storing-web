import type { ReactNode } from "react";
import { Highlight } from "@animate-ui/react/primitives/effects/highlight";
import { motionTokens } from "@animate-ui/react/utils/motion";
import { useAnimationStore } from "../../store/animationStore";
import "./NavigationHighlight.css";

export function NavigationHighlight({ value, children }: { value: string; children: ReactNode }) {
  const enabled = useAnimationStore((state) => state.enabled);
  return (
    <Highlight value={value} controlledItems mode="parent"
      transition={enabled ? motionTokens.spring.handoff : { duration: 0 }}
      containerClassName="navigation-highlight" className="navigation-highlight__indicator">
      {children}
    </Highlight>
  );
}
