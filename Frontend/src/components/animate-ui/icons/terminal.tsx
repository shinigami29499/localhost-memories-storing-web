import { motion, type Variants } from "motion/react";
import { getVariants, IconWrapper, useAnimateIconContext, type IconProps } from "./icon";
const animations = { default: { cursor: { initial: { opacity: 1 }, animate: { opacity: [1, 0, 1, 0, 1], transition: { duration: 1.5, ease: "easeInOut" } } } } satisfies Record<string, Variants> } as const;
type Props = IconProps<keyof typeof animations>;
function IconComponent({ size, ...props }: Props) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);
  return <motion.svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><motion.path d="M12 19h8" variants={variants.cursor} initial="initial" animate={controls} /><path d="m4 17 6-6-6-6" /></motion.svg>;
}
export function Terminal(props: Props) { return <IconWrapper icon={IconComponent} {...props} />; }
