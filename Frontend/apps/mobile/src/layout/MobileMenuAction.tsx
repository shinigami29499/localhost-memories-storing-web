import { createContext, useContext, useLayoutEffect, type Dispatch, type Ref, type RefObject, type SetStateAction } from "react";
import { Plus } from "@/components/animate-ui/icons/plus";
import { IconButton } from "@/components/ui/IconButton";
import { SplittingText } from "@animate-ui/react/primitives/texts/splitting";

export interface MenuAction {
  label: string;
  onClick: () => void;
  busy: boolean;
}

export const MobileMenuActionContext = createContext<{
  buttonRef: RefObject<HTMLButtonElement | null>;
  setAction: Dispatch<SetStateAction<MenuAction | null>>;
} | null>(null);

interface MenuActionProps {
  label: string;
  onClick?: () => void;
  ref?: Ref<HTMLButtonElement>;
  expanded: boolean;
  textOnly: boolean;
  motionEnabled: boolean;
  busy?: boolean;
}

export function MobileMenuActionButton({ label, onClick, ref, expanded, textOnly, motionEnabled, busy }: MenuActionProps) {
  return <IconButton ref={ref} size="fab" className="mobile-menu-bar__add mobile-animated-gradient" data-expanded={expanded || undefined}
    data-text-only={textOnly || undefined} data-unavailable={!onClick || undefined} aria-label={label} title={label}
    disabled={!onClick || busy} aria-busy={busy || undefined} onClick={onClick}>
    {!textOnly && <Plus aria-hidden="true" animate={onClick ? undefined : false}
      animateOnHover animateOnTap={false} animateOnView={false} />}
    {expanded && <SplittingText className="mobile-menu-bar__add-label" text={label} disableAnimation={!motionEnabled}
      delay={0.12} stagger={0.025} initial={{ x: 8, opacity: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} />}
  </IconButton>;
}

export function useMobileMenuAction(label: string, onClick?: () => void, busy = false) {
  const context = useContext(MobileMenuActionContext);
  const setAction = context?.setAction;

  useLayoutEffect(() => {
    if (!setAction || !onClick) return;
    const action = { label, onClick, busy };
    setAction(action);
    return () => setAction((current) => current === action ? null : current);
  }, [label, onClick, busy, setAction]);

  return context?.buttonRef;
}
