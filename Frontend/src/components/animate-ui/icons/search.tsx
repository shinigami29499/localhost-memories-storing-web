import { motion, type Variants } from "motion/react";
import { getVariants, IconWrapper, useAnimateIconContext, type IconProps } from "./icon";

const animations = {
  default: {
    group: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, -12, 12, 0],
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
      xmlns="http://www.w3.org/2000/svg"
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </motion.svg>
  );
}

export function Search(props: IconProps<"default">) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
