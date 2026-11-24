import { createContext, useContext, useLayoutEffect, type Dispatch, type Ref, type RefObject, type SetStateAction } from "react";
import { Plus } from "@/components/animate-ui/icons/plus";
import { IconButton } from "@/components/ui/IconButton";

interface MenuAction {
  label: string;
  onClick: () => void;
}

export const MobileMenuActionContext = createContext<{
  buttonRef: RefObject<HTMLButtonElement | null>;
  setAction: Dispatch<SetStateAction<MenuAction | null>>;
} | null>(null);

interface MenuActionProps {
  label: string;
  onClick?: () => void;
  ref?: Ref<HTMLButtonElement>;
}

export function MobileMenuActionButton({ label, onClick, ref }: MenuActionProps) {
  return <IconButton ref={ref} size="fab" className="mobile-menu-bar__add mobile-animated-gradient"
    aria-label={label} title={label} disabled={!onClick} onClick={onClick}>
    <Plus aria-hidden="true" animate={onClick ? undefined : false}
      animateOnHover animateOnTap={false} animateOnView={false} />
  </IconButton>;
}

export function useMobileMenuAction(label: string, onClick?: () => void) {
  const context = useContext(MobileMenuActionContext);
  const setAction = context?.setAction;

  useLayoutEffect(() => {
    if (!setAction || !onClick) return;
    const action = { label, onClick };
    setAction(action);
    return () => setAction((current) => current === action ? null : current);
  }, [label, onClick, setAction]);

  return context?.buttonRef;
}
