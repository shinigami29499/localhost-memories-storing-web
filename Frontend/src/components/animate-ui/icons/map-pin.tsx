import { motion, type Variants } from "motion/react";
import { getVariants, IconWrapper, useAnimateIconContext, type IconProps } from "./icon";

const animations = {
  default: {
    pin: {
      initial: { y: 0 },
      animate: { y: [0, -2, 0], transition: { duration: 0.4 } },
    },
  } satisfies Record<string, Variants>,
} as const;

type MapPinProps = IconProps<keyof typeof animations>;

function IconComponent({ size, ...props }: MapPinProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);
  return (
    <motion.svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <motion.g variants={variants.pin} initial="initial" animate={controls}>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx={12} cy={10} r={3} />
      </motion.g>
    </motion.svg>
  );
}

export function MapPin(props: MapPinProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
