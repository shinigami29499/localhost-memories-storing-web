import { motion, type Variants } from "motion/react";
import { getVariants, IconWrapper, useAnimateIconContext, type IconProps } from "./icon";
const animations = { default: { path: { initial: { y: 0 }, animate: { y: [0, 2, -2, 0], transition: { duration: 0.6, ease: "easeInOut" } } }, circle: { initial: { y: 0 }, animate: { y: [0, 1, -2, 0], transition: { duration: 0.6, ease: "easeInOut" } } }, group: { initial: { rotate: 0 }, animate: { rotate: [0, 90, 180], transition: { duration: 1.25, ease: "easeInOut" } } } } satisfies Record<string, Variants> } as const;
type Props = IconProps<keyof typeof animations>;
function IconComponent({ size, ...props }: Props) {
  const { controls } = useAnimateIconContext(); const variants = getVariants(animations);
  return <motion.svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <motion.path d="M2 21a8 8 0 0 1 10.434-7.62" variants={variants.path} initial="initial" animate={controls} /><motion.circle cx={10} cy={8} r={5} variants={variants.circle} initial="initial" animate={controls} />
    <motion.g variants={variants.group} initial="initial" animate={controls} style={{ transformOrigin: "18px 18px" }}><path d="m14.305 19.53.923-.382m0-2.296-.923-.383m2.547-1.241-.383-.923m.383 6.467-.383.924m2.679-6.468.383-.923m0 7.391-.383-.924m1.624-3.92.924-.383m-.924 2.679.924.383" /><circle cx={18} cy={18} r={3} /></motion.g>
  </motion.svg>;
}
export function UserRoundCog(props: Props) { return <IconWrapper icon={IconComponent} {...props} />; }
