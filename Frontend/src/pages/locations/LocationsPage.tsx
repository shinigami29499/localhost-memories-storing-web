import { useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useIsMutating, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button, ConfirmationDialog, ErrorState, showToast, Spinner } from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useAuthStore } from "../../store/authStore";
import { ApiError } from "../../services/api";
import { mediaPreviewUrl } from "../../utils/media";
import { useHomeLocation } from "../../features/locations/hooks/useHomeLocation";
import { HomeLocationPhotoConfirmation } from "../../features/locations/components/HomeLocationPhotoConfirmation";
import { useLocations } from "../../features/locations/hooks/useLocations";
import { useMapBounds } from "../../features/locations/hooks/useMapBounds";
import { locationService } from "../../features/locations/services/locationService";
import { locateUploadedBatch } from "../../features/locations/services/locateUploadedBatch";
import { LocationMap } from "../../features/locations/components/LocationMap";
import { CameraCaptureDialog } from "../../features/locations/components/CameraCaptureDialog";
import { LocationEditor } from "../../features/locations/components/LocationEditor";
import { uploadService } from "../../features/uploads/services/uploadService";
import { registerUploadCompletionAction } from "../../features/uploads/services/uploadRuntime";
import type { MediaFile, PickedLocation } from "../../features/media/types";
import type { HomeLocation } from "../../features/locations/types";
import "./locations.css";

export function LocationsPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMediaId = searchParams.get("mediaId");
  const focusedMediaId = searchParams.get("focusMediaId");
  const { bounds: mapBounds, update: handleMapBounds } = useMapBounds();
  const user = useAuthStore((state) => state.user);
  const home = useHomeLocation(user?.id);
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
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const uploadInFlight = useRef(false);
  const uploadLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [moveConfirmationOpen, setMoveConfirmationOpen] = useState(false);
  useEffect(() => {
    if (!requestedMediaId || selection) return;
    const requestedMedia = media.find((item) => item.id === requestedMediaId);
    if (requestedMedia) {
      setSelection({ id: requestedMedia.id, draft: requestedMedia.location ?? null, editing: true });
      setRelocatingId(requestedMedia.location ? requestedMedia.id : null);
    }
  }, [media, requestedMediaId, selection]);
  const selectedId = selection?.id;
  const draft = selection?.draft ?? null;
  const saving = useIsMutating({ mutationKey: ["media-location"] }) > 0;
  const [failedPreviews, setFailedPreviews] = useState<Set<string>>(() => new Set());
  const selected = media.find((item) => item.id === selectedId);
  const focused = media.find((item) => item.id === focusedMediaId);
  const relocating = relocatingId === selected?.id;
  const showDetails = !!selected && !!selection?.editing && !relocating;
  const canMove = (item: MediaFile) => !isMobile && !saving
    && (item.ownerId === user?.id || user?.role.toLowerCase() === "admin");
  const canEdit = !!selected && !!selection?.editing && canMove(selected);
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
    if (!selected || saving || (!isMobile && selection?.editing)) return;
    const dismissPreview = (event: MouseEvent) => {
      if (!(event.target instanceof Element)
        || document.querySelector('[role="dialog"], [role="alertdialog"]')
        || event.target.closest(".locations__marker, .locations__cluster-toggle, .locations__map-home-control, .map-navigation, .map-navigation__toolbar")) return;
      clearSelection();
    };
    document.addEventListener("click", dismissPreview);
    return () => document.removeEventListener("click", dismissPreview);
  }, [selected, saving, isMobile, selection?.editing, clearSelection]);

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
    if (!selected || !draft || !relocating) return;
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

  const startWithCurrentLocation = async (action: () => void) => {
    if (!navigator.geolocation) {
      showToast.error(t("Could not determine your current location. Check location permission and try again."));
      return;
    }
    try {
      uploadLocation.current = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
          () => reject(new Error(t("Could not determine your current location. Check location permission and try again."))),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
      });
      action();
    } catch (error) {
      uploadLocation.current = null;
      showToast.error(error instanceof Error ? error.message : t("Could not determine your current location. Check location permission and try again."));
    }
  };

  const uploadPhotos = async (files: File[]) => {
    if (!files.length || uploadInFlight.current) return;
    const coordinate = uploadLocation.current;
    uploadLocation.current = null;
    if (!coordinate) {
      showToast.error(t("Could not determine your current location. Check location permission and try again."));
      return;
    }
    uploadInFlight.current = true;
    setUploading(true);
    try {
      const batch = await uploadService.submit(files, (createdBatch) => {
        registerUploadCompletionAction(createdBatch.id, async (completedBatch) => {
          if (!completedBatch.successfulFiles) return;
          let taggedIds: string[];
          try {
            taggedIds = await locateUploadedBatch(completedBatch.id, coordinate);
          } catch {
            showToast.error(t("Photos uploaded, but could not mark their location."));
            return;
          }
          await queryClient.invalidateQueries({ queryKey: ["media"] });
          if (!taggedIds.length) {
            showToast.error(t("Photos uploaded, but could not mark their location."));
            return;
          }
          if (taggedIds.length < completedBatch.successfulFiles) showToast.error(t("Some uploaded photos could not be marked."));
          return `/location/travel?focusMediaId=${encodeURIComponent(taggedIds[0])}`;
        });
      });
      await queryClient.invalidateQueries({ queryKey: ["uploads"] });
      showToast.success(t("Begin uploading {count} media", { count: files.length }), { id: `upload-start:${batch.id}` });
    } catch (error) {
      showToast.error(t("Could not upload and mark these photos."), error instanceof Error ? error.message : undefined);
    } finally {
      uploadInFlight.current = false;
      setUploading(false);
    }
  };
  return (
    <main className="locations">
        <div className="locations__content">
          <div className="locations__inner">
            {homePicking && (
              <div className="locations__notice" role="status">
                <span>{t("Click the map or search for a place to set your home location.")}</span>
                <Button type="button" variant="secondary" disabled={home.save.isPending}
                  onClick={() => setHomePicking(false)}>{t("Cancel")}</Button>
              </div>
            )}
            {scanning && (
              <p className="locations__notice" role="status">
                {t("Scanned {count} photos.", { count: scanProgress })}
              </p>
            )}
            {scanError && <ErrorState message={scanError} />}
            {scanResult && (
              <p className="locations__notice locations__notice--done" role="status">
                {t("Scanned {count} photos; found {located} locations.", { count: scanResult.scanned, located: scanResult.located })}
              </p>
            )}
            {!!scanResult?.failedMediaIds.length && (
              <div className="locations__notice locations__notice--error" role="alert">
                <p>{t("{count} photos could not be scanned. Check the files and retry.", { count: scanResult.failedMediaIds.length })}</p>
                <ul>{scanResult.failedMediaIds.map((id) => (
                  <li key={id}>{media.find((item) => item.id === id)?.originalFilename ?? id}</li>
                ))}</ul>
              </div>
            )}
          {query.isLoading ? <Spinner /> : query.isError && !media.length ? (
            <ErrorState message="Could not load photos." onRetry={() => void query.refetch()} />
          ) : (
            <>
              <div ref={workspaceRef} className={`locations__workspace${showDetails ? "" : " locations__workspace--map-only"}`}>
            <div className="locations__map-panel">
              <LocationMap media={media} selected={selected} focused={focused} draft={draft} editable={canEdit && !saving}
                onBoundsChange={handleMapBounds}
                editing={!!selection?.editing} relocating={relocating}
                onConfirmRelocation={() => setMoveConfirmationOpen(true)}
                homeLocation={home.query.data ?? null} homeLocationReady={home.query.isFetched}
                homeActionDisabled={saving || home.save.isPending || uploading}
                homePicking={homePicking} homeRelocationDraft={homeRelocationDraft} onSelect={select} canMove={canMove} onMove={movePhoto}
                onAddPhotos={() => void startWithCurrentLocation(() => uploadInput.current?.click())}
                onOpenCamera={() => void startWithCurrentLocation(() => setCameraOpen(true))}
                onEdit={startRelocating}
                onCancelSelection={clearSelection}
                onPick={(location) => { if (selected) updateDraft(selected.id, location); }}
                onPickHome={pickHome}
                onMoveHome={(location) => {
                  setSelection(null);
                  setRelocatingId(null);
                  setHomePicking(false);
                  setHomeRelocationDraft(location);
                }}
                onConfirmHomeRelocation={() => setHomeMoveConfirmationOpen(true)}
                onCancelHomeRelocation={() => { setHomeMoveConfirmationOpen(false); setHomeRelocationDraft(null); }}
                onHomeClick={() => {
                  setSelection(null);
                  setRelocatingId(null);
                  const nextSearchParams = new URLSearchParams(searchParams);
                  nextSearchParams.delete("mediaId");
                  nextSearchParams.delete("focusMediaId");
                  setSearchParams(nextSearchParams, { replace: true });
                  setHomePicking(!home.query.data);
                }} />
            </div>
            {selected && showDetails && (
              <aside className="locations__details" aria-label={t("Selected photo")}>
                <div className="locations__details-head">
                  <h2>{selected.originalFilename}</h2>
                  <span className={`locations__status${selected.location ? " locations__status--located" : ""}`}>
                    <span className="locations__status-dot" aria-hidden="true" />
                    {t(selected.location ? "Located" : "No location")}
                  </span>
                </div>
                {failedPreviews.has(selected.id) ? <p role="alert">{t("Could not load this media.")}</p> : (
                  <img className="locations__selected-photo" src={mediaPreviewUrl(selected.id)}
                    alt={selected.originalFilename}
                    onError={() => setFailedPreviews((previous) => new Set(previous).add(selected.id))} />
                )}
                {selected.location && (
                  <p className="locations__coordinate-readout">
                    {selected.location.latitude.toFixed(6)}, {selected.location.longitude.toFixed(6)}
                  </p>
                )}
                {canEdit ? (
                  <LocationEditor key={selected.id} media={selected} draft={draft}
                    onChange={(location) => updateDraft(selected.id, location)}
                    onCancel={clearSelection}
                    onSaved={() => {
                      const nextSearchParams = new URLSearchParams(searchParams);
                      nextSearchParams.delete("mediaId");
                      nextSearchParams.set("focusMediaId", selected.id);
                      setSearchParams(nextSearchParams, { replace: true });
                      setSelection(null);
                      setRelocatingId(null);
                    }} />
                ) : <p className="locations__hint">{t(isMobile
                  ? "Editing photo locations is available on desktop."
                  : "Only the uploader or an administrator can change this location.")}</p>}
              </aside>
            )}
            </div>
              {query.isFetchNextPageError && <ErrorState message={t("Could not load more photos.")} onRetry={() => void query.fetchNextPage()} />}
              {query.isRefetchError && <ErrorState message="Could not refresh photos." onRetry={() => void query.refetch()} />}
              {query.hasNextPage && !query.isFetchNextPageError && (
                <div className="locations__load-more">
                  <p>{t("Showing {count} of {total} photos in this area.", {
                    count: query.data?.pages.reduce((sum, page) => sum + page.items.length, 0) ?? 0,
                    total: query.data?.pages[0]?.total ?? 0,
                  })}</p>
                  <Button type="button" variant="secondary" disabled={query.isFetchingNextPage || query.isPlaceholderData}
                    onClick={() => void query.fetchNextPage()}>
                    {query.isFetchingNextPage ? t("Loading photos…") : t("Load more photos")}
                  </Button>
                </div>
              )}
            </>
          )}
              <details className="locations__unlocated" onToggle={(event) => setShowUnlocated(event.currentTarget.open)}>
                <summary>{t("Photos without a location")}</summary>
                {unlocated.isPending && showUnlocated ? <Spinner label={t("Loading photos…")} /> : null}
                {unlocated.isError && !unlocated.data ? (
                  <ErrorState message={t("Could not load photos.")} onRetry={() => void unlocated.refetch()} />
                ) : unlocated.data ? (
                  <>
                    {unlocated.data.pages[0]?.total === 0 ? <p>{t("All photos have a location.")}</p> : (
                      <ul className="locations__unlocated-list">
                        {unlocated.data.pages.flatMap((page) => page.items).map((item) => (
                          <li key={item.id}>
                            <button type="button" onClick={() => {
                              queryClient.setQueryData(["media", "detail", item.id], item);
                              select(item, true);
                            }} aria-pressed={selectedId === item.id}>
                              <img src={mediaPreviewUrl(item.id, false, 320)} alt="" loading="lazy" />
                              <span>{item.originalFilename}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {unlocated.isFetchNextPageError ? (
                      <ErrorState message={t("Could not load more photos.")} onRetry={() => void unlocated.fetchNextPage()} />
                    ) : unlocated.hasNextPage ? (
                      <Button type="button" variant="secondary" disabled={unlocated.isFetchingNextPage}
                        onClick={() => void unlocated.fetchNextPage()}>
                        {t(unlocated.isFetchingNextPage ? "Loading photos…" : "Load more photos")}
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </details>
          </div>
        </div>

      {selected && draft && relocating && moveConfirmationOpen && (
        <ConfirmationDialog
          title="Move this photo?"
          confirmLabel="Move photo"
          onConfirm={confirmRelocation}
          onClose={() => setMoveConfirmationOpen(false)}
        >
          <p>{t("{name} will move to {latitude}, {longitude}.", {
            name: selected.originalFilename,
            latitude: draft.latitude.toFixed(6),
            longitude: draft.longitude.toFixed(6),
          })}</p>
        </ConfirmationDialog>
      )}

      {homeRelocationDraft && homeMoveConfirmationOpen && (
        <ConfirmationDialog
          title="Change your home location?"
          confirmLabel="Change home location"
          onConfirm={confirmHomeRelocation}
          onClose={() => setHomeMoveConfirmationOpen(false)}
        >
          <p>{t("Your home marker will move to {latitude}, {longitude}.", {
            latitude: homeRelocationDraft.latitude.toFixed(6),
            longitude: homeRelocationDraft.longitude.toFixed(6),
          })}</p>
        </ConfirmationDialog>
      )}

      <HomeLocationPhotoConfirmation
        location={home.photosHomeLocation}
        onConfirm={(location) => home.applyToPhotos.mutateAsync(location)}
        onClose={home.dismissPhotosConfirmation}
      />
      <input ref={uploadInput} type="file" accept="image/*" multiple hidden onChange={(event) => {
        const files = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        void uploadPhotos(files);
      }} />
      {cameraOpen ? <CameraCaptureDialog
        onCapture={(file) => void uploadPhotos([file])}
        onClose={() => setCameraOpen(false)}
      /> : null}
    </main>
  );
}
