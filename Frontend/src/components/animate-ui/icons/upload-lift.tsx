'use client';

import { motion, type Variants } from 'motion/react';
import { getVariants, useAnimateIconContext, IconWrapper, type IconProps } from './icon';

type UploadLiftProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { y: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
      animate: { y: -2, transition: { duration: 0.3, ease: 'easeInOut' } },
    },
  } satisfies Record<string, Variants>,
  'default-loop': {
    group: {
      initial: { y: 0, transition: { duration: 0.6, ease: 'easeInOut' } },
      animate: { y: [0, -2, 0], transition: { duration: 0.6, ease: 'easeInOut' } },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: UploadLiftProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);
  return (
    <motion.svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <motion.g variants={variants.group} initial="initial" animate={controls}>
        <path d="M12 3v12" />
        <path d="m17 8-5-5-5 5" />
      </motion.g>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </motion.svg>
  );
}

export function UploadLift(props: UploadLiftProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
