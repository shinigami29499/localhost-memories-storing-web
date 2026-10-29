'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type BookmarkProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: {
        y: 0,
        scaleY: 1,
      },
      animate: {
        y: [0, -2, 0],
        scaleY: [1, 1.08, 1],
        transition: { duration: 0.5, ease: 'easeInOut' },
      },
    },
    path: {},
  } satisfies Record<string, Variants>,
  fill: {
    group: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, -2, 0],
        transition: { duration: 0.5, ease: 'easeInOut' },
      },
    },
    path: {
      initial: {
        fill: 'currentColor',
        fillOpacity: 0,
      },
      animate: {
        fillOpacity: 1,
        transition: { delay: 0.15 },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: BookmarkProps) {
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
      style={{ originY: 0 }}
      {...props}
    >
      <motion.path
        d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
        variants={variants.path}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function Bookmark(props: BookmarkProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Bookmark,
  Bookmark as BookmarkIcon,
  type BookmarkProps,
  type BookmarkProps as BookmarkIconProps,
};
