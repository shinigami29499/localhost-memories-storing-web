'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type CameraProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {},
    path: {},
    circle: {
      initial: { scale: 1 },
      animate: { scale: [1, 0.7, 1], transition: { duration: 0.4 } },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: CameraProps) {
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
          d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
          variants={variants.path}
          initial="initial"
          animate={controls}
        />
        <motion.circle
          cx={12}
          cy={13}
          r={3}
          style={{ transformOrigin: '12px 13px' }}
          variants={variants.circle}
          initial="initial"
          animate={controls}
        />
      </motion.g>
    </motion.svg>
  );
}

function Camera(props: CameraProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Camera,
  Camera as CameraIcon,
  type CameraProps,
  type CameraProps as CameraIconProps,
};
