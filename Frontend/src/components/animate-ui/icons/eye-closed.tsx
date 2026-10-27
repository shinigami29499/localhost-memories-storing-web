import type { SVGProps } from "react";

export function EyeClosed({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 8a10.75 10.75 0 0 0 20 0M2 15l3-3M7 16l1-3M12 17v-3M17 16l-1-3M22 15l-3-3" />
    </svg>
  );
}
