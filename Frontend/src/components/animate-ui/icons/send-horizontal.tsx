'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type SendHorizontalProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { x: 0 },
      animate: {
        x: [0, 1.5, 0],
        transition: { ease: 'easeInOut', duration: 0.4 },
      },
    } satisfies Record<string, Variants>,
  },
} as const;

function IconComponent({ size, ...props }: SendHorizontalProps) {
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
      <motion.g variants={variants.group} initial="initial" animate={controls}>
        <motion.path d="m3.714 3.44 16.227 6.421a1 1 0 0 1 0 1.872L3.714 18.154a.5.5 0 0 1-.66-.607L6 12 3.054 4.047a.5.5 0 0 1 .66-.607Z" />
        <motion.path d="M6 12h14" />
      </motion.g>
    </motion.svg>
  );
}

function SendHorizontal(props: SendHorizontalProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  SendHorizontal,
  SendHorizontal as SendHorizontalIcon,
  type SendHorizontalProps,
  type SendHorizontalProps as SendHorizontalIconProps,
};
