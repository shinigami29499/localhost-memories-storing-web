import { Heart } from "@/components/animate-ui/icons/heart";
import { Laugh } from "lucide-react";
import { MessageCircle } from "@/components/animate-ui/icons/message-circle";
import { ThumbsUp } from "@/components/animate-ui/icons/thumbs-up";
import type { ReactionType } from "./ReactionControls";

const icons = { like: ThumbsUp, heart: Heart, laugh: Laugh, comment: MessageCircle };

export function ReactionIcon({ type, size = 20 }: { type: ReactionType | "comment"; size?: number }) {
  const Icon = icons[type];
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
