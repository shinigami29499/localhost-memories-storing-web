import type { ComponentPropsWithRef } from "react";

export function PageActionButton({ className = "", type = "button", ...props }: ComponentPropsWithRef<"button">) {
  return <button {...props} type={type} className={`gallery-selection-bar__action ${className}`} />;
}
