import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import "./icon-button.css";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "size" | "aria-label"> & {
  "aria-label": string;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  size?: "badge" | "button" | "fab";
  shape?: "circle" | "rounded-square";
};

export function IconButton({ children, size = "button", shape = "circle", className = "", type = "button", ...props }: IconButtonProps) {
  return (
    <button {...props} type={type} className={`icon-button icon-button--${size} icon-button--${shape} ${className}`}>
      <span className="icon-button__icon" aria-hidden="true">{children}</span>
    </button>
  );
}
