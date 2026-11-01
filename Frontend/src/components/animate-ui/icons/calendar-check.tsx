'use client';

import { motion, type Variants } from 'motion/react';
import { getVariants, useAnimateIconContext, IconWrapper, type IconProps } from './icon';

type CalendarCheckProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    calendar: {
      initial: { rotate: 0, scale: 1 },
      animate: {
        rotate: [0, -4, 0],
        scale: [1, 1.04, 1],
        transition: { duration: 0.45, ease: 'easeInOut' },
      },
    },
    check: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0, 1],
        opacity: [0, 1],
        transition: { duration: 0.35, delay: 0.1, ease: 'easeOut' },
      },
    },
    line: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: CalendarCheckProps) {
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
      <motion.g
        variants={variants.calendar}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: '12px 12px' }}
      >
        <motion.path d="M8 2v4M16 2v4M3 10h18" variants={variants.line} initial="initial" animate={controls} />
        <motion.rect x={3} y={4} width={18} height={18} rx={2} variants={variants.line} initial="initial" animate={controls} />
        <motion.path d="m9 16 2 2 4-4" variants={variants.check} initial="initial" animate={controls} />
      </motion.g>
    </motion.svg>
  );
}

function CalendarCheck(props: CalendarCheckProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  CalendarCheck,
  CalendarCheck as CalendarCheckIcon,
  type CalendarCheckProps,
  type CalendarCheckProps as CalendarCheckIconProps,
};
