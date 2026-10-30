import { IconWrapper, type IconProps } from "./icon";

type PlaneTakeoffProps = IconProps<"default">;

function IconComponent({ size, ...props }: PlaneTakeoffProps) {
  return (
    <svg
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
      <path d="M2 22h20" />
      <path d="m6.36 17.4-2.36-.4-2-2 2-1 6.1 1.22" />
      <path d="m8 17 5.5-6.5" />
      <path d="m18 2 4 4-10.5 10.5" />
      <path d="m13.5 11.5-4.5-1.5-2-2 1-2 5.5 4.5" />
    </svg>
  );
}

export function PlaneTakeoff(props: PlaneTakeoffProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
