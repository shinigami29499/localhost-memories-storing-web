import { useEffect, useRef } from "react";

export function OriginalImageLoader({ src, onLoad, onError }: {
  src: string;
  onLoad: (image: HTMLImageElement) => void;
  onError: () => void;
}) {
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  onLoadRef.current = onLoad;
  onErrorRef.current = onError;
  useEffect(() => {
    const loadedImage = new Image();
    let cancelled = false;
    loadedImage.decoding = "async";
    loadedImage.onload = () => {
      void loadedImage.decode().catch(() => undefined).then(() => {
        if (!cancelled) onLoadRef.current(loadedImage);
      });
    };
    loadedImage.onerror = () => onErrorRef.current();
    loadedImage.src = src;
    return () => {
      cancelled = true;
      loadedImage.onload = null;
      loadedImage.onerror = null;
    };
  }, [src]);

  return null;
}

