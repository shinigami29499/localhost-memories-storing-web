'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from './icon';

type ClockProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    circle: {},
    hands: {
      initial: { rotate: 0 },
      animate: { rotate: [0, 30, 0], transition: { duration: 0.45 } },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: ClockProps) {
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
      <motion.circle
        cx={12}
        cy={12}
        r={10}
        variants={variants.circle}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M12 6v6l4 2"
        style={{ transformOrigin: '12px 12px' }}
        variants={variants.hands}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function Clock(props: ClockProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Clock,
  Clock as ClockIcon,
  type ClockProps,
  type ClockProps as ClockIconProps,
};
