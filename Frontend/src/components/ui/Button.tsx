import type { ReactNode, ButtonHTMLAttributes } from "react";

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
      {busy ? <span className="btn__spinner" aria-hidden /> : null}
      {children}
    </button>
  );
}
