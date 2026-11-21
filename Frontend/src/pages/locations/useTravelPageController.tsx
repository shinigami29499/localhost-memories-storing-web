import { useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useIsMutating, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { showToast } from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useAuthStore } from "../../store/authStore";
import { ApiError } from "../../services/api";
import { useHomeLocation } from "../../features/locations/hooks/useHomeLocation";
import { useLocations } from "../../features/locations/hooks/useLocations";
import { useMapBounds } from "../../features/locations/hooks/useMapBounds";
import { locationService } from "../../features/locations/services/locationService";
import type { MediaFile, PickedLocation } from "../../features/media/types";
import type { HomeLocation } from "../../features/locations/types";


export function useTravelPageController({ allowPhoneEditing = false }: { allowPhoneEditing?: boolean } = {}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMediaId = searchParams.get("mediaId");
  const focusedMediaId = searchParams.get("focusMediaId");
  const { bounds: mapBounds, update: handleMapBounds } = useMapBounds();
  const user = useAuthStore((state) => state.user);
  const home = useHomeLocation(user?.id);
  const appliedHome = useRef<string | null>(null);
  useEffect(() => {
    const location = home.query.data;
    if (!user?.id || !location) return;
    const key = `${user.id}:${location.latitude}:${location.longitude}`;
    if (appliedHome.current === key) return;
    appliedHome.current = key;
    home.applyToPhotos.mutate(location, {
      onError: () => showToast.error(t("Could not assign Home to photos without a location.")),
    });
  }, [user?.id, home.query.data, home.applyToPhotos.mutate, t]);
  const [selection, setSelection] = useState<{ id: string; draft: PickedLocation | null; editing: boolean } | null>(null);
  const [showUnlocated, setShowUnlocated] = useState(false);
  const unlocated = useInfiniteQuery({
    queryKey: ["media", "unlocated"], initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => locationService.unlocatedPage(pageParam, signal),
    getNextPageParam: (page) => page.items.length > 0 && page.offset + page.items.length < page.total
      ? page.offset + page.items.length : undefined,
    enabled: showUnlocated,
  });
  const { query, media, scanning, scanProgress, scanResult, scanError } = useLocations(true,
    [requestedMediaId, focusedMediaId, selection?.id].filter((id): id is string => !!id), mapBounds);
  const [relocatingId, setRelocatingId] = useState<string | null>(null);
  const [homePicking, setHomePicking] = useState(false);
  const [homeRelocationDraft, setHomeRelocationDraft] = useState<HomeLocation | null>(null);
  const [homeMoveConfirmationOpen, setHomeMoveConfirmationOpen] = useState(false);
  useEffect(() => {
    if (!homeRelocationDraft) return;
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || home.save.isPending) return;
      event.preventDefault();
      event.stopPropagation();
      setHomeMoveConfirmationOpen(false);
      setHomeRelocationDraft(null);
    };
    window.addEventListener("keydown", cancelOnEscape, true);
    return () => window.removeEventListener("keydown", cancelOnEscape, true);
  }, [homeRelocationDraft, home.save.isPending]);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [moveConfirmationOpen, setMoveConfirmationOpen] = useState(false);
  useEffect(() => {
    if (!requestedMediaId || selection) return;
    const requestedMedia = media.find((item) => item.id === requestedMediaId);
    if (requestedMedia) {
      setSelection({ id: requestedMedia.id, draft: requestedMedia.location ?? null, editing: true });
      const canEdit = requestedMedia.ownerId === user?.id || ["admin", "superadmin"].includes(user?.role?.toLowerCase() ?? "");
      setRelocatingId(requestedMedia.location && (canEdit || (isMobile && !allowPhoneEditing)) ? requestedMedia.id : null);
    }
  }, [media, requestedMediaId, selection, user?.id, user?.role, isMobile, allowPhoneEditing]);
  const selectedId = selection?.id;
  const draft = selection?.draft ?? null;
  const saving = useIsMutating({ mutationKey: ["media-location"] }) > 0;
  const [failedPreviews, setFailedPreviews] = useState<Set<string>>(() => new Set());
  const selected = media.find((item) => item.id === selectedId);
  const focused = media.find((item) => item.id === focusedMediaId);
  const relocating = relocatingId === selected?.id;
  const showDetails = !!selected && !!selection?.editing && (!relocating || !isMobile || allowPhoneEditing);
  const canEditMedia = (item: MediaFile) => item.ownerId === user?.id || ["admin", "superadmin"].includes(user?.role?.toLowerCase() ?? "");
  const canEditHere = (item: MediaFile) => canEditMedia(item) && (!isMobile || allowPhoneEditing);
  const canMove = (item: MediaFile) => !saving && canEditHere(item);
  const canEdit = !!selected && !!selection?.editing && canEditHere(selected);
  const clearSelection = useCallback(() => {
    if (saving) return;
    if (document.activeElement instanceof HTMLElement
      && document.activeElement.closest(".locations__marker")) document.activeElement.blur();
    setSelection(null);
    setRelocatingId(null);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("mediaId");
    if (selected?.location) nextSearchParams.set("focusMediaId", selected.id);
    else nextSearchParams.delete("focusMediaId");
    setSearchParams(nextSearchParams, { replace: true });
  }, [saving, selected, searchParams, setSearchParams]);

  useEffect(() => {
    if (isMobile || !selected || saving) return;
    const hasOpenDialog = () => !!document.querySelector('[role="dialog"], [role="alertdialog"]');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || hasOpenDialog()
        || workspaceRef.current?.querySelector(".locations__scenes[open]")) return;
      clearSelection();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || hasOpenDialog()
        || workspaceRef.current?.contains(event.target) || event.target.closest(".map-navigation__toolbar")) return;
      clearSelection();
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isMobile, selected, saving, clearSelection]);

  useEffect(() => {
    if (!selected || saving || (selection?.editing && (!isMobile || allowPhoneEditing))) return;
    const dismissPreview = (event: MouseEvent) => {
      if (!(event.target instanceof Element)
        || document.querySelector('[role="dialog"], [role="alertdialog"]')
        || event.target.closest(".locations__marker, .locations__cluster-toggle, .locations__map-home-control, .map-navigation, .map-navigation__toolbar")) return;
      clearSelection();
    };
    document.addEventListener("click", dismissPreview);
    return () => document.removeEventListener("click", dismissPreview);
  }, [selected, saving, isMobile, allowPhoneEditing, selection?.editing, clearSelection]);

  const select = (item: MediaFile, editing = false) => {
    if (saving) return;
    if (focusedMediaId) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("focusMediaId");
      setSearchParams(nextSearchParams, { replace: true });
    }
    if (selection?.id === item.id) {
      clearSelection();
      return;
    }
    setSelection({ id: item.id, draft: item.location ?? null, editing });
    setRelocatingId(null);
  };
  const updateDraft = (id: string, location: PickedLocation | null) => {
    setSelection((current) => current?.id === id ? { ...current, draft: location } : current);
    if (!location) setRelocatingId((current) => current === id ? null : current);
  };
  const movePhoto = (item: MediaFile, location: PickedLocation) => {
    if (!canMove(item)) return;
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("mediaId");
    nextSearchParams.delete("focusMediaId");
    setSearchParams(nextSearchParams, { replace: true });
    setSelection({ id: item.id, draft: location, editing: true });
    setRelocatingId(item.id);
  };
  const startRelocating = (item: MediaFile) => {
    if (!item.location || !canMove(item)) return;
    setSelection({ id: item.id, draft: item.location, editing: true });
    setRelocatingId(item.id);
  };
  const confirmRelocation = async () => {
    if (!selected || !draft || !relocating || !canMove(selected)) return;
    await locationService.set(selected.id, draft);
    await queryClient.invalidateQueries({ queryKey: ["media"] });
    await queryClient.invalidateQueries({ queryKey: ["albums"] });
    showToast.success(t("Location saved."));
    setMoveConfirmationOpen(false);
    setSelection(null);
    setRelocatingId(null);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("mediaId");
    nextSearchParams.set("focusMediaId", selected.id);
    setSearchParams(nextSearchParams, { replace: true });
  };
  const pickHome = async (location: HomeLocation) => {
    try {
      await home.save.mutateAsync(location);
      setHomePicking(false);
      showToast.success(t("Home location saved."));
      return true;
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not save your home location."));
      return false;
    }
  };
  const confirmHomeRelocation = async () => {
    if (!homeRelocationDraft) return;
    await home.save.mutateAsync(homeRelocationDraft);
    setHomeMoveConfirmationOpen(false);
    setHomeRelocationDraft(null);
    showToast.success(t("Home location saved."));
  };

  return { t, queryClient, isMobile, searchParams, setSearchParams, handleMapBounds, home, selection, setSelection, showUnlocated, setShowUnlocated, unlocated, query, media, scanning, scanProgress, scanResult, scanError, setRelocatingId, homePicking, setHomePicking, homeRelocationDraft, setHomeRelocationDraft, homeMoveConfirmationOpen, setHomeMoveConfirmationOpen, workspaceRef, moveConfirmationOpen, setMoveConfirmationOpen, selectedId, draft, saving, failedPreviews, setFailedPreviews, selected, focused, relocating, showDetails, canMove, canEdit, clearSelection, select, updateDraft, movePhoto, startRelocating, confirmRelocation, pickHome, confirmHomeRelocation };
}
