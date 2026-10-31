import { motion, type Variants } from 'motion/react';
import { getVariants, useAnimateIconContext, IconWrapper, type IconProps } from './icon';

const animations = {
  default: {
    circle: {},
    line: { initial: { pathLength: 1 }, animate: { pathLength: [0, 1], transition: { duration: 0.3 } } },
  } satisfies Record<string, Variants>,
} as const;

type BanProps = IconProps<keyof typeof animations>;

function IconComponent({ size, ...props }: BanProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);
  return (
    <motion.svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <motion.circle cx={12} cy={12} r={10} variants={variants.circle} initial="initial" animate={controls} />
      <motion.path d="m4.9 4.9 14.2 14.2" variants={variants.line} initial="initial" animate={controls} />
    </motion.svg>
  );
}

export function Ban(props: BanProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
