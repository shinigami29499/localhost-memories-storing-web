import { Heart, Laugh, MessageCircle, ThumbsUp } from "lucide-react";
import type { ReactionType } from "./ReactionControls";

const icons = { like: ThumbsUp, heart: Heart, laugh: Laugh, comment: MessageCircle };

export function ReactionIcon({ type, size = 20 }: { type: ReactionType | "comment"; size?: number }) {
  const Icon = icons[type];
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
