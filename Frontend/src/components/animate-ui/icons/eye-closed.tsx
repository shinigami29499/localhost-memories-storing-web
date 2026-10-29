import { motion, type Variants } from "motion/react";
import { getVariants, IconWrapper, useAnimateIconContext, type IconProps } from "./icon";

const animations = {
  default: {
    group: {
      initial: { scaleY: 1 },
      animate: {
        scaleY: [1, 0.1, 1],
        transition: { duration: 0.4, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: IconProps<"default">) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={variants.group}
      initial="initial"
      animate={controls}
      {...props}
    >
      <path d="M2 8a10.75 10.75 0 0 0 20 0M2 15l3-3M7 16l1-3M12 17v-3M17 16l-1-3M22 15l-3-3" />
    </motion.svg>
  );
}

export function EyeClosed({ size = 24, ...props }: IconProps<"default">) {
  return <IconWrapper icon={IconComponent} size={size} {...props} />;
}
