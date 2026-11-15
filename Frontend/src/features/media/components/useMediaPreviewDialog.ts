import useEmblaCarousel from "@animate-ui/react/primitives/carousel";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect,useLayoutEffect,useRef,useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { mediaUrl } from "../../../utils/media";
import { useAlbums } from "../../albums/hooks/useAlbums";
import { loadImageAsPng } from "../services/loadImageAsPng";
import { mediaService } from "../services/mediaService";
import type { MediaFile } from "../types";

interface CommonProps {
  media: MediaFile[];
  initialMediaId: string;
  total?: number;
  loadingMore?: boolean;
  loadMoreError?: boolean;
  onLoadMore?: () => void;
  favoriteBusy?: boolean;
  onClose: (mediaId: string) => void;
}

export type MediaPreviewDialogProps = CommonProps & ({
  trashActions: { onRestore: (mediaId: string) => void; onDelete: (mediaId: string) => void };
  onToggleFavorite?: never;
} | {
  trashActions?: never;
  onToggleFavorite: (mediaId: string, isFavorited: boolean) => void;
});

export function useMediaPreviewDialog({
  media, initialMediaId, total = media.length, loadingMore = false, loadMoreError = false,
  onLoadMore, favoriteBusy = false, onToggleFavorite, onClose, trashActions,
}: MediaPreviewDialogProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteMediaId, setDeleteMediaId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const albumButtonRef = useRef<HTMLButtonElement>(null);
  const lastViewedId = useRef(initialMediaId);
  const [initialIndex] = useState(() => {
    const index = media.findIndex((item) => item.id === initialMediaId);
    return index >= 0 ? index : 0;
  });
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const selectedSnap = useRef(initialIndex);
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [copyResult, setCopyResult] = useState<{ mediaId: string } | null>(null);
  const [favoriteBurst, setFavoriteBurst] = useState<{ mediaId: string; revision: number } | null>(null);
  const favoriteBurstRevision = useRef(0);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const hasMore = Boolean(onLoadMore) && media.length < total;
  const loop = !hasMore && media.length >= (isMobile ? 3 : 5);
  const slideCount = media.length + (hasMore ? 1 : 0);
  const [carouselRef, api] = useEmblaCarousel({
    startIndex: selectedIndex,
    loop,
    align: "center",
    containScroll: false,
    scale: isMobile ? 1 : 0.8,
    visible: isMobile || slideCount === 1 ? 1 : 3,
    watchDrag: (_api, event) => !(event.target instanceof Element && event.target.closest(".video-player")),
  });
  const current = media[selectedIndex];
  const currentIndex = selectedIndex;
  const albums = useAlbums("mine", Boolean(current) && !trashActions, current?.id);
  const inAlbum = albums.data?.some((album) => album.containsMedia) ?? false;
  const imageCopied = copyResult !== null && copyResult.mediaId === current?.id;

  useEffect(() => {
    if (!copyResult) return;
    if (copyResult.mediaId !== current?.id) {
      setCopyResult(null);
      return;
    }
    const timeout = window.setTimeout(() => setCopyResult(null), 3_000);
    return () => window.clearTimeout(timeout);
  }, [copyResult, current?.id]);

  useEffect(() => {
    if (current) lastViewedId.current = current.id;
  }, [current]);

  useEffect(() => {
    if (media.length === 0) onClose(lastViewedId.current);
  }, [media.length, onClose]);

  useEffect(() => {
    if (hasMore && currentIndex >= media.length && !loadingMore && !loadMoreError) {
      onLoadMore?.();
    }
  }, [hasMore, currentIndex, media.length, loadingMore, loadMoreError, onLoadMore]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    closeRef.current?.focus();
    return () => dialog.close();
  }, []);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      selectedSnap.current = api.selectedScrollSnap();
      setSelectedIndex(selectedSnap.current);
    };
    const restoreSelection = () => {
      // Option changes reapply startIndex, including when the final page enables looping.
      api.scrollTo(Math.min(selectedSnap.current, Math.max(0, api.scrollSnapList().length - 1)), true);
      update();
    };
    update();
    api.on("settle", update).on("reInit", restoreSelection);
    return () => {
      api.off("settle", update).off("reInit", restoreSelection);
    };
  }, [api]);



  const close = () => {
    const dialog = dialogRef.current;
    if (!dialog || closingRef.current) return;
    closingRef.current = true;
    onClose(lastViewedId.current);
  };
  const toggleFavorite = () => {
    if (!current || favoriteBusy) return;
    if (!current.isFavorited) {
      favoriteBurstRevision.current += 1;
      setFavoriteBurst({ mediaId: current.id, revision: favoriteBurstRevision.current });
    }
    onToggleFavorite?.(current.id, current.isFavorited);
  };
  const copyImage = async () => {
    if (!current || current.mediaKind !== "image" || copyingImage) return;
    setCopyResult(null);
    setCopyingImage(true);
    try {
      const image = loadImageAsPng(mediaUrl(current.id));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
      if (current.id === lastViewedId.current) setCopyResult({ mediaId: current.id });
      showToast.success(t("Image copied"));
    } catch (error) {
      showToast.error(
        t("Could not copy the image."),
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setCopyingImage(false);
    }
  };

  const goToLocation = () => {
    if (!current) return;
    onClose(current.id);
    const parameter = current.location ? "focusMediaId" : "mediaId";
    navigate(`/location/travel?${parameter}=${encodeURIComponent(current.id)}`);
  };
  const closeAlbum = () => { setAlbumDialogOpen(false); albumButtonRef.current?.focus(); };
  const confirmDelete = async () => {
    if (!deleteMediaId) return;
    const mediaId = deleteMediaId;
    await mediaService.remove(mediaId);
    showToast.delete(t("Media moved to trash"), {
      undo: async () => {
        await mediaService.restore(mediaId);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["media"] }),
          queryClient.invalidateQueries({ queryKey: ["albums"] }),
        ]);
      },
    });
    return () => {
      onClose(mediaId);
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      void queryClient.invalidateQueries({ queryKey: ["albums"] });
    };
  };
  return { t, navigate, queryClient, deleteMediaId, setDeleteMediaId, dialogRef, closeRef, albumButtonRef, selectedIndex, albumDialogOpen, setAlbumDialogOpen, copyingImage, favoriteBurst, setFavoriteBurst, hasMore, loop, slideCount, carouselRef, api, current, currentIndex, albums, inAlbum, imageCopied, close, toggleFavorite, copyImage, goToLocation, closeAlbum, confirmDelete };
}

