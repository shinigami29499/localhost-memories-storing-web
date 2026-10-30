'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from './icon';

type ChartColumnProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    axis: {},
    bar1: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0, 1],
        opacity: [0, 1],
        transition: { duration: 0.3, delay: 0.05, ease: 'easeOut' },
      },
    },
    bar2: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0, 1],
        opacity: [0, 1],
        transition: { duration: 0.3, delay: 0.2, ease: 'easeOut' },
      },
    },
    bar3: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0, 1],
        opacity: [0, 1],
        transition: { duration: 0.3, delay: 0.35, ease: 'easeOut' },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: ChartColumnProps) {
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
      <motion.path
        d="M3 3v16a2 2 0 0 0 2 2h16"
        variants={variants.axis}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M8 17v-3"
        variants={variants.bar1}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M13 17V5"
        variants={variants.bar2}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M18 17V9"
        variants={variants.bar3}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function ChartColumn(props: ChartColumnProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  ChartColumn,
  ChartColumn as ChartColumnIcon,
  type ChartColumnProps,
  type ChartColumnProps as ChartColumnIconProps,
};
