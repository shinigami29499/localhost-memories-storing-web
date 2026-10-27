import type { ReactNode, ButtonHTMLAttributes } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", busy, disabled, children, ...rest }: ButtonProps) {
  return (
    <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
      <button
        className={`btn btn--${variant}`}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        {...rest}
      >
        {busy ? <LoaderCircle animate={false} className="btn__spinner" aria-hidden="true" /> : null}
        {children}
      </button>
    </AnimateIcon>
  );
}
