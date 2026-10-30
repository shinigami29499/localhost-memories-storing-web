import { useMemo } from "react";
import Avatar, { genConfig } from "react-nice-avatar";
import "./user-avatar.css";

interface UserAvatarProps {
  user: { id: string; avatarSeed?: string | null };
  className: string;
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  const seed = user.avatarSeed ?? user.id;
  const config = useMemo(() => genConfig(seed), [seed]);

  return (
    <span className={className} aria-hidden="true">
      <Avatar className="user-avatar" {...config} />
    </span>
  );
}
