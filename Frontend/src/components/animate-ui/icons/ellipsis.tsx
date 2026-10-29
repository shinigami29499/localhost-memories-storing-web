import { motion } from "motion/react";
import { IconWrapper, useAnimateIconContext, type IconProps } from "@animate-ui/react/icons";

function IconComponent({ size, ...props }: IconProps<"default">) {
  const { controls } = useAnimateIconContext();

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      {[5, 12, 19].map((cx, index) => (
        <motion.circle
          key={cx}
          cx={cx}
          cy={12}
          r={1.5}
          variants={{
            initial: { y: 0 },
            animate: { y: [0, -2, 0], transition: { duration: 0.3, delay: index * 0.06 } },
          }}
          initial="initial"
          animate={controls}
        />
      ))}
    </motion.svg>
  );
}

export function Ellipsis(props: IconProps<"default">) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
