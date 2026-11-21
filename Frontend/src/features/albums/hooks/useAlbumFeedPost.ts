import { useRef, useState } from "react";
import { useInView } from "motion/react";
import { useInfiniteAlbumMedia, useInvalidateAlbums } from "./useAlbums";
import { albumService } from "../services/albumService";
import type { Album } from "../types";

export function useAlbumFeedPost(album: Album) {
  const invalidateAlbums = useInvalidateAlbums();
  const [deleting, setDeleting] = useState(false);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const inView = useInView(previewRef, { margin: "200px 0px" });
  const [imageIndex, setImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const media = useInfiniteAlbumMedia(album.id, 5, inView && album.mediaCount > 0);
  const items = media.data?.pages.flatMap((page) => page.items) ?? [];
  const previewId = items[imageIndex]?.id ?? (!media.data ? album.previewMediaId : null);
  const failed = previewId !== null && failedPreview === previewId;
  const previousImage = () => {
    if (imageIndex > 0) {
      setSlideDirection(-1);
      setImageIndex((index) => index - 1);
    }
  };
  const nextImage = async () => {
    if (imageIndex + 1 < items.length) {
      setSlideDirection(1);
      setImageIndex((index) => index + 1);
    } else if (media.hasNextPage && !media.isFetchingNextPage) {
      const result = await media.fetchNextPage();
      if (result.data && result.data.pages.flatMap((page) => page.items).length > imageIndex + 1) {
        setSlideDirection(1);
        setImageIndex((index) => index + 1);
      }
    }
  };
  const deleteAlbum = async () => {
    await albumService.remove(album.id);
    await invalidateAlbums(true);
  };
  return { deleting, setDeleting, failedPreview, setFailedPreview, attempt, setAttempt, previewRef, swipeStart, suppressClick, inView, imageIndex, slideDirection, media, items, previewId, failed, previousImage, nextImage, deleteAlbum };
}
