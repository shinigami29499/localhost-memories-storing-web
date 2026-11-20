import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { getVariants, useAnimateIconContext, IconWrapper, type IconProps } from "./icon";

const animations = {
  default: {
    left: { initial: { x: 0 }, animate: { x: [-1, 1, 0], transition: { duration: 0.45, ease: "easeInOut" } } },
    right: { initial: { x: 0 }, animate: { x: [1, -1, 0], transition: { duration: 0.45, ease: "easeInOut" } } },
  } satisfies Record<string, Variants>,
} as const;
type Props = IconProps<keyof typeof animations>;
function IconComponent({ size, ...props }: Props) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);
  return <motion.svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><motion.path d="M8 5v14" variants={variants.left} initial="initial" animate={controls} /><motion.path d="M16 5v14" variants={variants.right} initial="initial" animate={controls} /></motion.svg>;
}
export function Pause(props: Props) { return <IconWrapper icon={IconComponent} {...props} />; }

