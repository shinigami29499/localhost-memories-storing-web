import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { useInView } from "motion/react";
import { useCallback,useRef,useState } from "react";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl,mediaUrl } from "../../../utils/media";
import type { MediaFile } from "../types";

export interface PreviewSlideProps {
  media: MediaFile;
  active: boolean;
  preloadOriginal: boolean;
  includeDeleted: boolean;
  favoriteBurst: number | null;
  onFavoriteBurstEnd: (revision: number) => void;
}

export function usePreviewSlide({ media, includeDeleted }: PreviewSlideProps) {
  const { t } = useLocale();
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { margin: "200px 0px" });
  const previewUrl = mediaPreviewUrl(media.id, includeDeleted);
  const originalUrl = mediaUrl(media.id, includeDeleted);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const [loadedOriginalUrl, setLoadedOriginalUrl] = useState<string | null>(null);
  const reduceMotion = useShouldReduceMotion();
  const handleOriginalLoad = useCallback((image: HTMLImageElement) => {
    setLoadedOriginalUrl(originalUrl);
    stageRef.current?.style.setProperty("--media-aspect", String(image.naturalWidth / image.naturalHeight));
  }, [originalUrl]);
  const handlePreviewError = useCallback(() => {
    setFailedUrls((current) => new Set(current).add(previewUrl));
  }, [previewUrl]);
  const handleOriginalError = useCallback(() => {
    setFailedUrls((current) => new Set(current).add(originalUrl));
  }, [originalUrl]);

  return { t, stageRef, inView, previewUrl, originalUrl, failedUrls, setFailedUrls, loadedOriginalUrl, reduceMotion, handleOriginalLoad, handlePreviewError, handleOriginalError };
}
