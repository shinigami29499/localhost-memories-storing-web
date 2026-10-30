import { motion, type Variants } from "motion/react";
import { getVariants, IconWrapper, useAnimateIconContext, type IconProps } from "./icon";

const animations = {
  default: {
    group: {
      initial: { rotate: 0 },
      animate: {
        rotate: 90,
        transition: { duration: 0.4, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

type SettingsProps = IconProps<keyof typeof animations>;

function IconComponent({ size, ...props }: SettingsProps) {
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
      <path d="M10 2h4l.5 2.5 1.5.6 2.1-1.4 2.2 2.2L18.9 8l.6 1.5L22 10v4l-2.5.5-.6 1.5 1.4 2.1-2.2 2.2-2.1-1.4-1.5.6L14 22h-4l-.5-2.5-1.5-.6-2.1 1.4-2.2-2.2L5.1 16l-.6-1.5L2 14v-4l2.5-.5L5.1 8 3.7 5.9l2.2-2.2L8 5.1l1.5-.6Z" />
      <circle cx={12} cy={12} r={3} />
    </motion.svg>
  );
}

export function Settings(props: SettingsProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
