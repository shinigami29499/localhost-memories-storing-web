import type { ReactNode, ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { playUiSound } from "../../services/sounds";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", busy, disabled, children, className, onClick, ...rest }: ButtonProps) {
  return (
      <button
        className={`btn btn--${variant}${className ? ` ${className}` : ""}`}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        {...rest}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) playUiSound("ui/button_soft");
        }}
      >
        {busy ? <LoaderCircle animate={false} className="btn__spinner" aria-hidden="true" /> : null}
        {children}
      </button>
  );
}
