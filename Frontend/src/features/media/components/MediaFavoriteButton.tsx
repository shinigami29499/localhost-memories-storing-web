import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Particles, ParticlesEffect } from "@animate-ui/react/primitives/effects/particles";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { Heart } from "@/components/animate-ui/icons/heart";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { useLocale } from "@/context/LocaleContext";

interface Props {
  isFavorited: boolean;
  busy: boolean;
  onToggle: () => void;
}

export function MediaFavoriteButton({ isFavorited, busy, onToggle }: Props) {
  const { t } = useLocale();
  const reduceMotion = useShouldReduceMotion();
  const previousFavorite = useRef(isFavorited);
  const [burst, setBurst] = useState(0);
  const label = t(isFavorited ? "Remove from favorites" : "Add to favorites");
  const animateFavorite = burst > 0 && isFavorited && !reduceMotion;

  useEffect(() => {
    if (busy) return;
    if (isFavorited && !previousFavorite.current) setBurst((value) => value + 1);
    if (!isFavorited) setBurst(0);
    previousFavorite.current = isFavorited;
  }, [isFavorited, busy]);

  return (
    <Particles animate={animateFavorite}>
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
            duration: reduceMotion ? 0 : 0.4,
            times: [0, 0.4, 1],
            ease: ["easeOut", [0.34, 1.56, 0.64, 1]],
          }}
        >
          {busy ? (
            <LoaderCircle size={20} className="spinner__wheel" aria-hidden="true" />
          ) : (
            <Heart
              size={20}
              animate={false}
              stroke={isFavorited ? "var(--danger)" : "currentColor"}
              fill={isFavorited ? "var(--danger)" : "none"}
              aria-hidden="true"
            />
          )}
        </motion.span>
      </button>
      <ParticlesEffect
        key={burst}
        style={{ top: "50%", left: "50%" }}
        className="media-preview-dialog__favorite-particle"
        aria-hidden="true"
      />
    </Particles>
  );
}
