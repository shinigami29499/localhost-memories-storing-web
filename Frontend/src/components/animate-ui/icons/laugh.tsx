'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type LaughProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: {
        rotate: 0,
        scale: 1,
      },
      animate: {
        rotate: [0, -10, 10, -10, 0],
        scale: [1, 1.1, 1, 1.1, 1],
        transition: {
          duration: 0.6,
          ease: 'easeInOut',
        },
      },
    },
    path: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: LaughProps) {
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
      variants={variants.group}
      initial="initial"
      animate={controls}
      {...props}
    >
      <motion.circle cx="12" cy="12" r="10" />
      <motion.path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <motion.line x1="9" y1="9" x2="9.01" y2="9" />
      <motion.line x1="15" y1="9" x2="15.01" y2="9" />
    </motion.svg>
  );
}

function Laugh(props: LaughProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Laugh,
  Laugh as LaughIcon,
  type LaughProps,
  type LaughProps as LaughIconProps,
};
