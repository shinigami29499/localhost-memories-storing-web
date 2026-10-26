'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type VideoProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {},
    path: { initial: { x: 0 }, animate: { x: [0, 1, 0], transition: { duration: 0.4 } } },
    rect: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: VideoProps) {
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
        <motion.path
          d="m22 8-6 4 6 4V8Z"
          variants={variants.path}
          initial="initial"
          animate={controls}
        />
        <motion.rect
          width={14}
          height={12}
          x={2}
          y={6}
          rx={2}
          ry={2}
          variants={variants.rect}
          initial="initial"
          animate={controls}
        />
      </motion.g>
    </motion.svg>
  );
}

function Video(props: VideoProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Video,
  Video as VideoIcon,
  type VideoProps,
  type VideoProps as VideoIconProps,
};