'use client';

import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type HomeProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.08, 1],
        transition: { duration: 0.4, ease: 'easeInOut' },
      },
    },
    path: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: HomeProps) {
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
      <motion.path
        d="m3 10 9-7 9 7v11a1 1 0 0 1-1 1h-6v-8H10v8H4a1 1 0 0 1-1-1z"
        variants={variants.path}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function Home(props: HomeProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Home,
  Home as HomeIcon,
  type HomeProps,
  type HomeProps as HomeIconProps,
};
