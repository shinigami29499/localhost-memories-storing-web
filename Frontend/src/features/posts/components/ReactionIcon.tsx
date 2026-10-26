import { Heart } from "@/components/animate-ui/icons/heart";
import { Laugh } from "@/components/animate-ui/icons/laugh";
import { MessageCircle } from "@/components/animate-ui/icons/message-circle";
import { ThumbsUp } from "@/components/animate-ui/icons/thumbs-up";
import { AnimateIcon } from "@animate-ui/react/icons";
import type { ReactionType } from "./ReactionControls";

const icons = { like: ThumbsUp, heart: Heart, laugh: Laugh, comment: MessageCircle };

export function ReactionIcon({ type, size = 20, animate = false }: { type: ReactionType | "comment"; size?: number; animate?: boolean }) {
  const Icon = icons[type];

  if (animate) {
    return (
      <AnimateIcon animateOnTap>
        <Icon size={size} strokeWidth={1.7} aria-hidden="true" />
      </AnimateIcon>
    );
  }

  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
