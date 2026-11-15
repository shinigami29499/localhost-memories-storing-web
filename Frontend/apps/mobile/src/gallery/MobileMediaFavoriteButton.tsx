import { motion } from "motion/react";
import { Particles, ParticlesEffect } from "@animate-ui/react/primitives/effects/particles";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Heart } from "@/components/animate-ui/icons/heart";
import { useMediaFavoriteButton, type MediaFavoriteButtonProps } from "@/features/media/components/useMediaFavoriteButton";

export function MobileMediaFavoriteButton(props: MediaFavoriteButtonProps) {
  const { isFavorited, busy, onToggle } = props;
  const { label, iconsEnabled, reduceMotion, burst, animateFavorite } = useMediaFavoriteButton(props);
  return (
    <Particles animate={animateFavorite}>
      <AnimateIcon animateOnHover animateOnTap={false} completeOnStop asChild>
        <button
          type="button"
          className="viewer-icon-btn media-preview-dialog__action"
          aria-label={label}
          title={label}
          aria-pressed={isFavorited}
          aria-busy={busy || undefined}
          disabled={busy}
          onClick={onToggle}
        >
          <motion.span
            className="media-preview-dialog__favorite-icon"
            initial={false}
            animate={{ scale: animateFavorite ? [1, 1.3, 1] : 1 }}
            transition={{
              duration: reduceMotion || !iconsEnabled ? 0 : 0.4,
              times: [0, 0.4, 1],
              ease: ["easeOut", [0.34, 1.56, 0.64, 1]],
            }}
          >
            <Heart
              size={20}
              fill={isFavorited ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </motion.span>
        </button>
      </AnimateIcon>
      <ParticlesEffect
        key={burst}
        style={{ top: "50%", left: "50%" }}
        className="media-preview-dialog__favorite-particle"
        aria-hidden="true"
      />
    </Particles>
  );
}
