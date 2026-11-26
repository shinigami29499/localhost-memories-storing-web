import { useEffect, useId, useRef, useState, type UIEvent } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCustomDialog } from "../../../components/ui/CustomDialog";
import { showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { useDialogViewportStyle } from "../../../hooks/useDialogViewportStyle";
import { useThrottledCallback } from "../../../hooks/useThrottledCallback";
import { UI_TIMING } from "../../../config/uiTiming";
import { measureUpload, type TransferProgress } from "../../uploads/uploadProgress";
import { mediaQueryOptions } from "../hooks/useMedia";
import { previewService } from "../services/previewService";
import type { MediaFile } from "../types";

export interface PhotoPickerProps {
  selectedId: string | null;
  selectedIds?: string[];
  maxImages?: number;
  onConfirm: (image: MediaFile | null, previousImage: MediaFile | null) => void;
  onUploadedPreview: (mediaId: string) => void;
  onClose: () => void;
  backdropClassName?: string;
  viewportClassName?: string;
}

type PhotoSource = "gallery" | "preview";
const PAGE_SIZE = 48;

export function usePhotoPicker({
  selectedId, selectedIds = [], maxImages = Infinity, onConfirm, onUploadedPreview, onClose,
}: PhotoPickerProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const translate = useRef(t);
  translate.current = t;
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const uploadRequest = useRef<AbortController | null>(null);
  const pickerDrafts = useRef(new Set<string>());
  const confirmedId = useRef<string | null>(null);
  const focusedSelection = useRef(false);
  const [source, setSource] = useState<PhotoSource>("gallery");
  const [picked, setPicked] = useState<MediaFile | null>(null);
  const [uploaded, setUploaded] = useState<MediaFile[]>([]);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [previewTransfer, setPreviewTransfer] = useState<{ file: File; progress: TransferProgress }>();
  const [initialized, setInitialized] = useState(!selectedId);
  const tabId = useId();
  const initialImage = useQuery({
    queryKey: ["picker-image", selectedId],
    queryFn: ({ signal }) => previewService.getImage(selectedId!, signal),
    enabled: Boolean(selectedId),
    staleTime: 0,
  });
  const gallery = useInfiniteQuery({
    ...mediaQueryOptions(PAGE_SIZE, "all", "image"),
    enabled: initialized && source === "gallery",
  });
  const previews = useInfiniteQuery({
    queryKey: ["previews", PAGE_SIZE],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => previewService.list(pageParam, PAGE_SIZE, signal),
    getNextPageParam: (page) => page.offset + page.items.length < page.total
      ? page.offset + page.items.length : undefined,
    enabled: initialized && source === "preview",
  });
  const query = source === "gallery" ? gallery : previews;
  const busy = uploadingPreview;
  const { dialogProps, close } = useCustomDialog(onClose, { blocked: busy });
  const viewportStyle = useDialogViewportStyle();
  const full = selectedIds.length >= maxImages && !initialImage.data?.isPreviewOnly;
  const pageImages = query.data?.pages.flatMap((page) => page.items) ?? [];
  const availableImages = [...(source === "preview" ? uploaded : []), ...pageImages];
  const images = [...new Map([
    ...(picked && Boolean(picked.isPreviewOnly) === (source === "preview")
      && !availableImages.some((image) => image.id === picked.id) ? [picked] : []),
    ...availableImages,
  ].map((image) => [image.id, image])).values()];

  useEffect(() => {
    if (!initialized && initialImage.data) {
      setPicked(initialImage.data);
      setSource(initialImage.data.isPreviewOnly ? "preview" : "gallery");
      setInitialized(true);
    }
  }, [initialized, initialImage.data]);

  useEffect(() => {
    if (initialized && !query.isPending && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
      if (!focusedSelection.current) {
        selectedRef.current.focus({ preventScroll: true });
        focusedSelection.current = true;
      }
    }
  }, [initialized, source, query.isPending]);

  useEffect(() => {
    const drafts = pickerDrafts.current;
    return () => {
      uploadRequest.current?.abort();
      for (const mediaId of drafts) {
        if (mediaId !== confirmedId.current) {
          void previewService.releaseDraft(mediaId)
            .then(() => queryClient.invalidateQueries({ queryKey: ["previews"] }))
            .catch((error: unknown) => showToast.error(
              translate.current("Could not remove unused preview."), error instanceof Error ? error.message : undefined,
            ));
        }
      }
    };
  }, [queryClient]);

  const upload = async (file: File | undefined) => {
    if (source !== "preview" || !file || uploadRequest.current) return;
    if (file.type && !file.type.startsWith("image/")) {
      showToast.error(t("Choose an image file."));
      return;
    }
    const controller = new AbortController();
    uploadRequest.current = controller;
    const initial: TransferProgress = { status: "uploading", loaded: 0, total: file.size };
    setPreviewTransfer({ file, progress: initial });
    setUploadingPreview(true);
    try {
      const image = await previewService.upload(file,
        measureUpload(file.size, (progress) => setPreviewTransfer({ file, progress })), controller.signal);
      setPreviewTransfer({ file, progress: { ...initial, status: "success", loaded: file.size } });
      pickerDrafts.current.add(image.id);
      onUploadedPreview(image.id);
      setUploaded((current) => [image, ...current]);
      setPicked(image);
      void queryClient.invalidateQueries({ queryKey: ["previews"] });
    } catch (error) {
      setPreviewTransfer((current) => ({
        file,
        progress: {
          ...(current?.progress ?? initial),
          status: controller.signal.aborted ? "cancelled" : "failed",
          error: controller.signal.aborted ? undefined : error instanceof Error ? error.message : "Upload failed.",
        },
      }));
    } finally {
      uploadRequest.current = null;
      setUploadingPreview(false);
    }
  };

  const changeSource = (value: string) => {
    setSource(value === "preview" ? "preview" : "gallery");
    bodyRef.current?.scrollTo({ top: 0 });
  };
  const checkScroll = useThrottledCallback((element: HTMLDivElement) => {
    const range = element.scrollHeight - element.clientHeight;
    if (range - element.scrollTop < 160 && query.hasNextPage
      && !query.isFetchingNextPage && !query.isFetchNextPageError) void query.fetchNextPage({ cancelRefetch: false });
  }, UI_TIMING.SCROLL_THROTTLE);
  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    checkScroll(event.currentTarget);
  };
  const confirm = () => {
    confirmedId.current = picked?.id ?? null;
    onConfirm(picked, initialImage.data ?? null);
    close();
  };
  return { t, inputRef, bodyRef, selectedRef, source, picked, setPicked, initialized, tabId, initialImage, query, busy, dialogProps, viewportStyle, full, images, upload, previewTransfer,
    cancelPreviewUpload: () => uploadRequest.current?.abort(), dismissPreviewUpload: () => setPreviewTransfer(undefined),
    close, changeSource, handleScroll, confirm };
}
