import { motion } from "motion/react";
import { IconWrapper, type IconProps } from "./icon";

type Props = IconProps<"default">;
function IconComponent({ size, ...props }: Props) {
  return <motion.svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m8 5 11 7-11 7z" /></motion.svg>;
}
export function Play(props: Props) { return <IconWrapper icon={IconComponent} {...props} />; }

