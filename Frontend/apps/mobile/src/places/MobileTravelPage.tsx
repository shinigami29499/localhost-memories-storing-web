import { useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useIsMutating, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button, ErrorState, showToast, Spinner } from "@/components/ui";
import { MobileConfirmationDialog as ConfirmationDialog } from "../gallery/MobileConfirmationDialog";
import { useLocale } from "@/context/LocaleContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAuthStore } from "@/store/authStore";
import { ApiError } from "@/services/api";
import { mediaPreviewUrl } from "@/utils/media";
import { useHomeLocation } from "@/features/locations/hooks/useHomeLocation";
import { useLocations } from "@/features/locations/hooks/useLocations";
import { useMapBounds } from "@/features/locations/hooks/useMapBounds";
import { locationService } from "@/features/locations/services/locationService";
import { locateUploadedBatch } from "@/features/locations/services/locateUploadedBatch";
import { MobileLocationMap as LocationMap } from "./MobileLocationMap";
import { MobileCameraCaptureDialog as CameraCaptureDialog } from "./MobileCameraCaptureDialog";
import { MobileLocationEditor as LocationEditor } from "./MobileLocationEditor";
import { MobilePhotoMarkerPreview } from "./MobilePhotoMarkerPreview";
import { uploadService } from "@/features/uploads/services/uploadService";
import { registerUploadCompletionAction } from "@/features/uploads/services/uploadRuntime";
import type { MediaFile, PickedLocation } from "@/features/media/types";
import type { HomeLocation } from "@/features/locations/types";
import "./mobile-travel.css";

import { useTravelPageController } from "@/pages/locations/useTravelPageController";

export function MobileTravelPage() {
  const { t, queryClient, isMobile, searchParams, setSearchParams, handleMapBounds, home, selection, setSelection, showUnlocated, setShowUnlocated, unlocated, query, media, scanning, scanProgress, scanResult, scanError, setRelocatingId, homePicking, setHomePicking, homeRelocationDraft, setHomeRelocationDraft, homeMoveConfirmationOpen, setHomeMoveConfirmationOpen, uploading, cameraOpen, setCameraOpen, uploadInput, workspaceRef, moveConfirmationOpen, setMoveConfirmationOpen, selectedId, draft, saving, failedPreviews, setFailedPreviews, selected, focused, relocating, showDetails, canMove, canEdit, clearSelection, select, updateDraft, movePhoto, startRelocating, confirmRelocation, pickHome, confirmHomeRelocation, startWithCurrentLocation, uploadPhotos } = useTravelPageController({ allowPhoneEditing: true });
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
          {query.isLoading ? <Spinner page /> : query.isError && !media.length ? (
            <ErrorState message="Could not load photos." onRetry={() => void query.refetch()} />
          ) : (
            <>
              <div ref={workspaceRef} className={`locations__workspace${showDetails ? "" : " locations__workspace--map-only"}`}>
            <div className="locations__map-panel">
              <LocationMap MarkerPreview={MobilePhotoMarkerPreview} media={media} selected={selected} focused={focused} draft={draft} editable={canEdit && !saving}
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
                ) : <p className="locations__hint">{t("Only the uploader or an administrator can change this location.")}</p>}
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
                    {query.isFetchingNextPage ? t("Loading photos...") : t("Load more photos")}
                  </Button>
                </div>
              )}
            </>
          )}
              <details className="locations__unlocated" onToggle={(event) => setShowUnlocated(event.currentTarget.open)}>
                <summary>{t("Photos without a location")}</summary>
                {unlocated.isPending && showUnlocated ? <Spinner label={t("Loading photos...")} /> : null}
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
                        {t(unlocated.isFetchingNextPage ? "Loading photos..." : "Load more photos")}
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
