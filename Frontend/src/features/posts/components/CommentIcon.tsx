import { MessageCircle } from "@/components/animate-ui/icons/message-circle";
import { AnimateIcon, useAnimateIconContext } from "@animate-ui/react/icons";

export function CommentIcon({ size = 20, animate = false }: { size?: number; animate?: boolean }) {
  const { controls } = useAnimateIconContext();

  if (controls) {
    return <MessageCircle size={size} strokeWidth={1.7} aria-hidden="true" />;
  }

  if (animate) {
    return (
      <AnimateIcon animateOnHover animateOnTap>
        <MessageCircle size={size} strokeWidth={1.7} aria-hidden="true" />
      </AnimateIcon>
    );
  }

  return <MessageCircle size={size} strokeWidth={1.7} animateOnHover aria-hidden="true" />;
}
