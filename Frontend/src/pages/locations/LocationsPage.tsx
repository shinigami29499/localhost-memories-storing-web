import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { ScrollProgress, ScrollProgressContainer, ScrollProgressProvider } from "@animate-ui/react/primitives/scroll-progress";
import { useSearchParams } from "react-router-dom";
import { Button, ErrorState, showToast, Spinner } from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useAuthStore } from "../../store/authStore";
import { ApiError } from "../../services/api";
import { mediaPreviewUrl } from "../../utils/media";
import { useHomeLocation } from "../../features/locations/hooks/useHomeLocation";
import { HomeLocationPhotoConfirmation } from "../../features/locations/components/HomeLocationPhotoConfirmation";
import { useLocations } from "../../features/locations/hooks/useLocations";
import { LocationMap } from "../../features/locations/components/LocationMap";
import { LocationEditor } from "../../features/locations/components/LocationEditor";
import type { MediaFile, PickedLocation } from "../../features/media/types";
import type { HomeLocation } from "../../features/locations/types";
import "./locations.css";

export function LocationsPage() {
  const { t } = useLocale();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMediaId = searchParams.get("mediaId");
  const focusedMediaId = searchParams.get("focusMediaId");
  const user = useAuthStore((state) => state.user);
  const home = useHomeLocation(user?.id);
  const { query, media, scanning, scanProgress, scanResult, scanError } = useLocations();
  const [selection, setSelection] = useState<{ id: string; draft: PickedLocation | null; editing: boolean } | null>(null);
  const [homePicking, setHomePicking] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!requestedMediaId || selection) return;
    const requestedMedia = media.find((item) => item.id === requestedMediaId);
    if (requestedMedia) setSelection({ id: requestedMedia.id, draft: requestedMedia.location ?? null, editing: true });
  }, [media, requestedMediaId, selection]);
  const selectedId = selection?.id;
  const draft = selection?.draft ?? null;
  const saving = useIsMutating({ mutationKey: ["media-location"] }) > 0;
  const [failedPreviews, setFailedPreviews] = useState<Set<string>>(() => new Set());
  const selected = media.find((item) => item.id === selectedId);
  const focused = media.find((item) => item.id === focusedMediaId);
  const showDetails = !!selected && !!selection?.editing && !isMobile;
  const canMove = (item: MediaFile) => !isMobile && !saving
    && (item.ownerId === user?.id || user?.role.toLowerCase() === "admin");
  const canEdit = !!selected && !!selection?.editing && canMove(selected);
  const clearSelection = useCallback(() => {
    if (saving) return;
    if (document.activeElement instanceof HTMLElement
      && document.activeElement.closest(".locations__marker")) document.activeElement.blur();
    setSelection(null);
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
        || workspaceRef.current?.contains(event.target)) return;
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
        || event.target.closest(".locations__marker, .locations__cluster-toggle, .locations__map-home-control, .map-navigation")) return;
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
  };
  const pickHome = async (location: HomeLocation) => {
    try {
      await home.save.mutateAsync(location);
      setHomePicking(false);
      showToast.success(t("Home location saved."));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not save your home location."));
    }
  };
  return (
    <main className="locations">
      <ScrollProgressProvider>
        <div className="locations__scroll-track" aria-hidden="true">
          <ScrollProgress mode="scaleX" className="locations__scroll-progress" />
        </div>
        <ScrollProgressContainer className="locations__content">
          <div className="locations__inner">
            <header className="locations__header">
              <p className="locations__eyebrow">{t("Your library")}</p>
              <h1>{t("Travel")}<span className="brand__dot">.</span></h1>
              <p>{t("Browse photos and videos with locations in your library.")}</p>
            </header>
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
                homeLocation={home.query.data ?? null} homeLocationReady={home.query.isFetched}
                homeActionDisabled={saving || home.save.isPending}
                homePicking={homePicking} onSelect={select} canMove={canMove} onMove={movePhoto}
                onPick={(location) => { if (selected) updateDraft(selected.id, location); }}
                onPickHome={(location) => void pickHome(location)}
                onHomeClick={() => {
                  setSelection(null);
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
                    }} />
                ) : <p className="locations__hint">{t("Only the uploader or an administrator can change this location.")}</p>}
              </aside>
            )}
            </div>
              {query.isFetchNextPageError && <ErrorState message="Could not load all photos." onRetry={() => void query.fetchNextPage()} />}
              {query.isRefetchError && <ErrorState message="Could not refresh photos." onRetry={() => void query.refetch()} />}
              {query.hasNextPage && !query.isFetchNextPageError && <Spinner label="Loading photos…" />}
            </>
          )}
          </div>
        </ScrollProgressContainer>
      </ScrollProgressProvider>

      <HomeLocationPhotoConfirmation
        location={home.photosHomeLocation}
        onConfirm={(location) => home.applyToPhotos.mutateAsync(location)}
        onClose={home.dismissPhotosConfirmation}
      />
    </main>
  );
}
