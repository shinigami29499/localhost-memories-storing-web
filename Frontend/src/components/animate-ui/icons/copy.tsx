import { motion, type Variants } from "motion/react";
import { motionTokens } from "@animate-ui/react/utils/motion";
import { getVariants, IconWrapper, useAnimateIconContext, type IconProps } from "./icon";

type CopyProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    front: {
      initial: { x: 0, y: 0 },
      animate: {
        x: [0, 1.5, 0],
        y: [0, 1.5, 0],
        transition: motionTokens.transition.reveal,
      },
    },
    back: {
      initial: { x: 0, y: 0 },
      animate: {
        x: [0, -1.5, 0],
        y: [0, -1.5, 0],
        transition: motionTokens.transition.reveal,
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: CopyProps) {
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
      {...props}
    >
      <motion.g variants={variants.front} initial="initial" animate={controls}>
        <rect x="8" y="8" width="13" height="13" rx="2" />
      </motion.g>
      <motion.g variants={variants.back} initial="initial" animate={controls}>
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </motion.g>
    </motion.svg>
  );
}

function Copy(props: CopyProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Copy,
  Copy as CopyIcon,
  type CopyProps,
  type CopyProps as CopyIconProps,
};
