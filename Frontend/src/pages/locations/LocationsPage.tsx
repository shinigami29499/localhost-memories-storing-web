import { useEffect, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button, EmptyState, ErrorState, Spinner } from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import { useAuthStore } from "../../store/authStore";
import { mediaPreviewUrl } from "../../utils/media";
import { useLocations } from "../../features/locations/hooks/useLocations";
import { LocationMap } from "../../features/locations/components/LocationMap";
import { LocationEditor } from "../../features/locations/components/LocationEditor";
import type { MediaFile, PickedLocation } from "../../features/media/types";
import "./locations.css";

export function LocationsPage() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const requestedMediaId = searchParams.get("mediaId");
  const user = useAuthStore((state) => state.user);
  const { query, media, scan, scanning, scanProgress, scanResult, scanError } = useLocations();
  const [selection, setSelection] = useState<{ id: string; draft: PickedLocation | null } | null>(null);
  useEffect(() => {
    if (!requestedMediaId || selection) return;
    const requestedMedia = media.find((item) => item.id === requestedMediaId);
    if (requestedMedia) setSelection({ id: requestedMedia.id, draft: requestedMedia.location ?? null });
  }, [media, requestedMediaId, selection]);
  const selectedId = selection?.id;
  const draft = selection?.draft ?? null;
  const saving = useIsMutating({ mutationKey: ["media-location"] }) > 0;
  const [failedPreviews, setFailedPreviews] = useState<Set<string>>(() => new Set());
  const selected = media.find((item) => item.id === selectedId);
  const canEdit = !!selected && (selected.ownerId === user?.id || user?.role.toLowerCase() === "admin");
  const locatedCount = media.filter((item) => item.location).length;
  const select = (item: MediaFile) => {
    if (!saving) setSelection({ id: item.id, draft: item.location ?? null });
  };
  const updateDraft = (id: string, location: PickedLocation | null) => {
    setSelection((current) => current?.id === id ? { id, draft: location } : current);
  };

  return (
    <main className="locations">
      <header className="locations__header">
        <div>
          <h1>{t("Locations")}<span className="brand__dot">.</span></h1>
          <p>{t("Explore where your photos were taken.")}</p>
        </div>
        <Button variant="secondary" onClick={() => void scan()} busy={scanning}>
          {t(scanning ? "Scanning photos…" : "Scan existing photos")}
        </Button>
      </header>
      <p className="locations__hint">{t("Mapbox requires internet access and receives map coordinates. Photos stay on this server.")}</p>
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
          <div className="locations__workspace">
            <div className="locations__map-panel">
              <LocationMap media={media} selected={selected} draft={draft} editable={canEdit && !saving}
                onSelect={select} onPick={(location) => { if (selected) updateDraft(selected.id, location); }} />
            </div>
            <aside className="locations__details" aria-label={t("Selected photo")}>
              {selected ? (
                <>
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
                      onChange={(location) => updateDraft(selected.id, location)} />
                  ) : <p className="locations__hint">{t("Only the uploader or an administrator can change this location.")}</p>}
                </>
              ) : <EmptyState title="Select a photo" hint="Choose a map pin or photo below to view its location." />}
            </aside>
          </div>
          <div className="locations__library-header">
            <h2>{t("Photos")} <span>{t("{located} of {total} located", { located: locatedCount, total: query.data?.pages[0]?.total ?? 0 })}</span></h2>
          </div>
          {query.isFetchNextPageError && <ErrorState message="Could not load all photos." onRetry={() => void query.fetchNextPage()} />}
          {query.isRefetchError && <ErrorState message="Could not refresh photos." onRetry={() => void query.refetch()} />}
          {query.hasNextPage && !query.isFetchNextPageError && <Spinner label="Loading photos…" />}
          {!media.length ? <EmptyState title="No photos to show" hint="Upload photos." /> : (
            <ul className="locations__photos">
              {media.map((item) => (
                <li key={item.id}>
                  <button type="button" className="locations__photo" aria-pressed={selectedId === item.id} disabled={saving}
                    onClick={() => select(item)}>
                    {!failedPreviews.has(item.id) && <img src={mediaPreviewUrl(item.id)} alt="" loading="lazy"
                      onError={() => setFailedPreviews((previous) => new Set(previous).add(item.id))} />}
                    <span>{item.originalFilename}</span>
                    <span className={`locations__status${item.location ? " locations__status--located" : ""}`}>
                      <span className="locations__status-dot" aria-hidden="true" />
                      {t(item.location ? "Located" : "No location")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
