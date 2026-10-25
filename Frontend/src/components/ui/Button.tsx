import type { ReactNode, ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", busy, disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <LoaderCircle className="btn__spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
