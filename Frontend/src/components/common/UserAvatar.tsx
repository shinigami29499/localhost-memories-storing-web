import "./user-avatar.css";

interface UserAvatarProps {
  user: { id: string; username?: string; avatarSeed?: string | null };
  className: string;
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  const hasSavedAvatar = Boolean(user.avatarSeed);
  const seed = user.avatarSeed ?? user.id;
  const initials = (user.username ?? user.id).slice(0, 2).toUpperCase();
  const colorIndex = Array.from(user.id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 6;

  return (
    <span
      className={`${className} user-avatar${hasSavedAvatar ? " user-avatar--saved" : " user-avatar--fallback"}`}
      style={{ "--user-avatar-color-index": colorIndex } as React.CSSProperties}
      aria-hidden="true"
    >
      {hasSavedAvatar ? (
        <img
          className="user-avatar__image"
          src={`https://api.dicebear.com/10.x/clay/svg?seed=${encodeURIComponent(seed)}`}
          alt=""
        />
      ) : initials}
    </span>
  );
}
