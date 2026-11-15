import { useEffect, useRef, useState } from "react";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { useLocale } from "@/context/LocaleContext";
import { useAnimationStore } from "@/store/animationStore";

export interface MediaFavoriteButtonProps {
  isFavorited: boolean;
  busy: boolean;
  onToggle: () => void;
}

export function useMediaFavoriteButton({ isFavorited, busy }: MediaFavoriteButtonProps) {
  const { t } = useLocale();
  const iconsEnabled = useAnimationStore((state) => state.iconsEnabled);
  const reduceMotion = useShouldReduceMotion();
  const previousFavorite = useRef(isFavorited);
  const [burst, setBurst] = useState(0);
  const label = t(isFavorited ? "Remove from favorites" : "Add to favorites");
  const animateFavorite = burst > 0 && isFavorited && iconsEnabled && !reduceMotion;

  useEffect(() => {
    if (busy) return;
    if (isFavorited && !previousFavorite.current) setBurst((value) => value + 1);
    if (!isFavorited) setBurst(0);
    previousFavorite.current = isFavorited;
  }, [isFavorited, busy]);

  return { label, iconsEnabled, reduceMotion, burst, animateFavorite };
}
