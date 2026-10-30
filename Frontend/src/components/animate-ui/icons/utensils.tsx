import { motion, type Variants } from "motion/react";
import { getVariants, IconWrapper, useAnimateIconContext, type IconProps } from "./icon";

const animations = {
  default: {
    fork: {
      initial: { rotate: 0 },
      animate: { rotate: [0, -8, 0], transition: { duration: 0.4 } },
    },
    knife: {
      initial: { rotate: 0 },
      animate: { rotate: [0, 8, 0], transition: { duration: 0.4 } },
    },
  } satisfies Record<string, Variants>,
} as const;

type UtensilsProps = IconProps<keyof typeof animations>;

function IconComponent({ size, ...props }: UtensilsProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);
  return (
    <motion.svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <motion.g variants={variants.fork} initial="initial" animate={controls} style={{ transformOrigin: "7px 22px" }}>
        <path d="M3 2v7a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V2" />
        <path d="M7 2v20" />
      </motion.g>
      <motion.g variants={variants.knife} initial="initial" animate={controls} style={{ transformOrigin: "19px 22px" }}>
        <path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3Zm0 0v7" />
      </motion.g>
    </motion.svg>
  );
}

export function Utensils(props: UtensilsProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
