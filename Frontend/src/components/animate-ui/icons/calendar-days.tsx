'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from './icon';

type CalendarDaysProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { rotate: 0 },
      animate: { rotate: [0, -5, 0], transition: { duration: 0.35 } },
    },
    path: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: CalendarDaysProps) {
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
        variants={variants.group}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: '12px 12px' }}
      >
        <motion.path d="M8 2v4" variants={variants.path} initial="initial" animate={controls} />
        <motion.path d="M16 2v4" variants={variants.path} initial="initial" animate={controls} />
        <motion.rect x={3} y={4} width={18} height={18} rx={2} variants={variants.path} initial="initial" animate={controls} />
        <motion.path d="M3 10h18" variants={variants.path} initial="initial" animate={controls} />
        <motion.path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" variants={variants.path} initial="initial" animate={controls} />
      </motion.g>
    </motion.svg>
  );
}

function CalendarDays(props: CalendarDaysProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  CalendarDays,
  CalendarDays as CalendarDaysIcon,
  type CalendarDaysProps,
  type CalendarDaysProps as CalendarDaysIconProps,
};
