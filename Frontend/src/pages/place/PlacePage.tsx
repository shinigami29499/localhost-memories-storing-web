import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, startTransition, useCallback, useEffect, useRef, useState, useMemo, type CSSProperties } from "react";
import { HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { NavigationHighlight } from "../../components/ui";
import { PageActionBar, usePageActionBarFooter } from "../../components/layout/PageActionBar";
import { Pagination, DEFAULT_PAGE_SIZE } from "../../components/ui/Pagination";
import {
  Button,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  Spinner,
  showToast,
} from "../../components/ui";
import { CalendarCheck } from "../../components/animate-ui/icons/calendar-check";
import { AnimateIcon } from "../../components/animate-ui/icons/icon";
import { Send } from "../../components/animate-ui/icons/send";
import { Pencil } from "../../components/animate-ui/icons/pencil";
import { Search } from "../../components/animate-ui/icons/search";
import { useLocale } from "../../context/LocaleContext";
import { useAuthStore } from "../../store/authStore";
import { ApiError } from "../../services/api";
import { useHomeLocation } from "../../features/locations/hooks/useHomeLocation";
import { useLocations } from "../../features/locations/hooks/useLocations";
import { useMapBounds } from "../../features/locations/hooks/useMapBounds";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { uploadService } from "../../features/uploads/services/uploadService";
import { registerUploadCompletionAction } from "../../features/uploads/services/uploadRuntime";
import { locationService } from "../../features/locations/services/locationService";
import { locateUploadedBatch } from "../../features/locations/services/locateUploadedBatch";
import { LocationEditor } from "../../features/locations/components/LocationEditor";
import { useAnimationStore } from "../../store/animationStore";
import { HomeLocationPhotoConfirmation } from "../../features/locations/components/HomeLocationPhotoConfirmation";
import { MapLoadingOverlay } from "../../features/locations/components/MapLoadingOverlay";
import "../../features/locations/components/mapControls.css";
import type { PlaceMapSettings } from "../../features/place/components/PlaceMap";
import { AddNavigationToolbar } from "../../features/navigation/components/AddNavigationToolbar";
import { placeService } from "../../features/place/services/placeService";
import { PlaceDialog } from "../../features/place/components/PlaceDialog";
import { SinglePlaceVisitHistory } from "../../features/place/components/SinglePlaceVisitHistory";
import { PlaceVisitHistory } from "../../features/place/components/PlaceVisitHistory";
import {
  PlaceEditor,
  type PlaceFormValues,
} from "../../features/place/components/PlaceEditor";
import { StarRating } from "../../features/place/components/StarRating";
import { Star } from "../../components/animate-ui/icons/star";
import { SlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number";
import {
  useCheckInPlace,
  useDeletePlace,
  useDeletePlaceVisit,
  usePagedPlaceVisitHistory,
  useInfinitePlaces,
  useInfiniteMapPlaces,
  usePlace,
  useSavePlace,
} from "../../features/place/hooks/usePlaces";
import {
  DEFAULT_PLACE_MARKER_COLOR,
  DEFAULT_PLACE_MARKER_ICON,
  type PlaceCoordinate,
  type Place,
} from "../../features/place/types";
import type { MediaFile, PickedLocation } from "../../features/media/types";
import "./place.css";

const PlaceMap = lazy(() => import("../../features/place/components/PlaceMap").then((module) => ({ default: module.PlaceMap })));

interface EditorState {
  id?: string;
  coordinate: PlaceCoordinate | null;
  values: PlaceFormValues;
}

const emptyValues: PlaceFormValues = {
  name: "",
  address: "",
  note: "",
  markerIcon: DEFAULT_PLACE_MARKER_ICON,
  markerColor: DEFAULT_PLACE_MARKER_COLOR,
  mediaIds: [],
};

function toEditorState(place: Place): EditorState {
  return {
    id: place.id,
    coordinate: { latitude: place.latitude, longitude: place.longitude },
    values: {
      name: place.name,
      address: place.address,
      note: place.note,
      markerIcon: place.markerIcon,
      markerColor: place.markerColor,
      mediaIds: [...place.mediaIds],
    },
  };
}

type PlaceView = "map" | "saved" | "history";

function PlaceViewSwitch({ view, onChange }: { view: PlaceView; onChange: (view: PlaceView) => void }) {
  const { t } = useLocale();

  return (
    <div className="navigation-highlight-bar place__view-switch" role="group" aria-label={t("Place view")}>
      <NavigationHighlight value={view}>
        {([ ["map", "Map"], ["saved", "Saved"], ["history", "History"] ] as const).map(([value, label]) => (
          <HighlightItem key={value} value={value} asChild>
            <button type="button" aria-pressed={view === value}
              onClick={() => onChange(value)}>
              {t(label)}
            </button>
          </HighlightItem>
        ))}
      </NavigationHighlight>
    </div>
  );
}

export function PlacePage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const home = useHomeLocation(user?.id);
  const view: PlaceView = location.pathname.replace(/\/$/, "").endsWith("/saved") ? "saved"
    : location.pathname.replace(/\/$/, "").endsWith("/history") ? "history" : "map";
  const requestView = useCallback((nextView: PlaceView) => {
    if (nextView === view) return;
    startTransition(() => {
      void navigate(nextView === "map" ? "/location" : `/location/${nextView}`);
    });
  }, [navigate, view]);
  const mapSettings = useRef<PlaceMapSettings>({ scene: "3d", showMarkers: true, showPhotoMarkers: false });
  const saved = view !== "map";
  const actionBarFooter = usePageActionBarFooter();
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const [mapStartReady, setMapStartReady] = useState(!animationsEnabled);
  const [addToolbar, setAddToolbar] = useState<{ visible: boolean; disabled: boolean; add: () => void } | null>(null);
  useEffect(() => {
    if (saved) {
      setMapStartReady(false);
      return;
    }
    if (mapStartReady) return;
    if (!animationsEnabled) {
      setMapStartReady(true);
      return;
    }
    let cancelled = false;
    let pause: number | undefined;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const elements = [document.querySelector(".place__view-switch"), actionBarFooter];
        const animations = elements.flatMap((element) => element?.getAnimations({ subtree: true }) ?? [])
          .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
        void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
          if (!cancelled) pause = window.setTimeout(() => setMapStartReady(true), 150);
        });
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); window.clearTimeout(pause); };
  }, [actionBarFooter, animationsEnabled, mapStartReady, saved]);
  const [placeSearch, setPlaceSearch] = useState("");
  const debouncedSearch = useDebouncedValue(placeSearch);
  const [minimumRating, setMinimumRating] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [photoSelection, setPhotoSelection] = useState<{ id: string; draft: PickedLocation | null; editing: boolean } | null>(null);
  const { bounds: mapBounds, update: handleMapBounds } = useMapBounds();
  const { media: photos, query: photosQuery } = useLocations(!saved, photoSelection ? [photoSelection.id] : [], mapBounds);
  const [uploading, setUploading] = useState(false);
  const uploadInFlight = useRef(false);
  const uploadLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const savedPlaces = useInfinitePlaces(view === "saved", debouncedSearch, minimumRating);
  const mapPlacesQuery = useInfiniteMapPlaces(!saved, mapBounds);
  const query = saved ? savedPlaces : mapPlacesQuery;
  const save = useSavePlace();
  const remove = useDeletePlace();
  const checkInMutation = useCheckInPlace();
  const removeVisitMutation = useDeletePlaceVisit();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => !saved ? (location.state as { focusPlaceId?: string } | null)?.focusPlaceId ?? null : null);
  const selectedPlaceQuery = usePlace(selectedId, !saved);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const visitHistory = usePagedPlaceVisitHistory(historyPage, historyPageSize, view === "history");
  const historyTotal = visitHistory.data?.total ?? 0;
  const currentHistoryPage = Math.min(historyPage, Math.max(1, Math.ceil(historyTotal / historyPageSize)));
  useEffect(() => {
    if (visitHistory.data && historyPage !== currentHistoryPage) setHistoryPage(currentHistoryPage);
  }, [visitHistory.data, historyPage, currentHistoryPage]);
  const [formError, setFormError] = useState<string | null>(null);
  const [placeToDelete, setPlaceToDelete] = useState<Place | null>(null);
  const [placeToMove, setPlaceToMove] = useState<{ place: Place; coordinate: PlaceCoordinate } | null>(null);
  const [moveConfirmationOpen, setMoveConfirmationOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [manualHomePick, setManualHomePick] = useState(false);
  const [homeDialogOpen, setHomeDialogOpen] = useState(false);
  const [confirmHomeRemoval, setConfirmHomeRemoval] = useState(false);
  const [photoMoveConfirmationOpen, setPhotoMoveConfirmationOpen] = useState(false);

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
  const places = useMemo(() => saved
    ? savedPlaces.data?.pages.flatMap((page) => page.items) ?? []
    : mapPlacesQuery.data?.pages.flatMap((page) => page.items) ?? [], [saved, savedPlaces.data, mapPlacesQuery.data]);
  const filteredPlaces = places;
  const homePicking = manualHomePick;
  const selected = saved ? places.find((place) => place.id === selectedId) : selectedPlaceQuery.data;
  const selectedPhoto = photos.find((photo) => photo.id === photoSelection?.id);
  const photoRelocating = !!photoSelection?.editing;
  const canEdit = (place: Place) => place.owner.id === user?.id || isAdmin;
  const canChangeMarker = (place: Place) => canEdit(place) && !editor && !homePicking
    && !placeToMove && !placeToDelete && !save.isPending && !remove.isPending;
  const mapPlaces = useMemo(() => {
    const withSelection = selectedPlaceQuery.data && !places.some((place) => place.id === selectedPlaceQuery.data.id)
      ? [...places, selectedPlaceQuery.data] : places;
    return placeToMove
      ? withSelection.filter((place) => place.id === placeToMove.place.id)
      : withSelection.filter((place) => !(editor?.id === place.id && editor.coordinate && !editorOpen));
  }, [places, selectedPlaceQuery.data, editor?.id, editor?.coordinate, editorOpen, placeToMove]);
  const clearPreview = useCallback(() => {
    if (document.activeElement instanceof HTMLElement
      && document.activeElement.closest(".place__marker, .locations__marker")) document.activeElement.blur();
    setSelectedId(null);
    setDetailsOpen(false);
    setPhotoSelection(null);
  }, []);

  const canMovePhoto = (photo: MediaFile) => !saved && !homePicking && !photoMoveConfirmationOpen
    && (photo.ownerId === user?.id || isAdmin);
  const selectPhoto = (photo: MediaFile) => {
    if (photoSelection?.id === photo.id) {
      setPhotoSelection(null);
      return;
    }
    setSelectedId(null);
    setDetailsOpen(false);
    setPhotoSelection({ id: photo.id, draft: photo.location ?? null, editing: false });
  };
  const movePhoto = (photo: MediaFile, coordinate: PlaceCoordinate) => {
    if (!canMovePhoto(photo)) return;
    setPhotoSelection({ id: photo.id, draft: coordinate, editing: true });
  };
  const confirmPhotoMove = async () => {
    if (!selectedPhoto || !photoSelection?.draft || !photoRelocating) return;
    await locationService.set(selectedPhoto.id, photoSelection.draft);
    await queryClient.invalidateQueries({ queryKey: ["media"] });
    await queryClient.invalidateQueries({ queryKey: ["albums"] });
    showToast.success(t("Location saved."));
    setPhotoMoveConfirmationOpen(false);
    setPhotoSelection(null);
  };

  useEffect(() => {
    if ((!selectedId && !photoSelection) || photoSelection?.editing || editor || save.isPending || remove.isPending) return;
    const dismissPreview = (event: MouseEvent) => {
      if (!(event.target instanceof Element)
        || document.querySelector('[role="dialog"], [role="alertdialog"]')
        || event.target.closest(".place__marker, .locations__marker, .locations__cluster-toggle, .place__card, .place__map-home-control, .map-navigation, .map-navigation__toolbar")) return;
      clearPreview();
    };
    document.addEventListener("click", dismissPreview);
    return () => document.removeEventListener("click", dismissPreview);
  }, [selectedId, photoSelection, editor, save.isPending, remove.isPending, clearPreview]);

  const pickHome = async (coordinate: PlaceCoordinate) => {
    try {
      await home.save.mutateAsync(coordinate);
      setManualHomePick(false);
      showToast.success(t("Home location saved."));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not save your home location."));
    }
  };

  const cancelHomePick = () => {
    setManualHomePick(false);
  };

  const startHomePick = () => {
    setHomeDialogOpen(false);
    setManualHomePick(true);
  };

  const openHomeDialog = () => {
    setHomeDialogOpen(true);
    void home.query.refetch();
  };

  const removeHomeLocation = async () => {
    await home.clear.mutateAsync();
    showToast.delete(t("Home location removed."));
  };

  const checkIn = async (place: Place) => {
    try {
      await checkInMutation.mutateAsync(place.id);
      showToast.success(t("Visit saved."));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not check in at this place."));
    }
  };

  const removeVisit = async (visit: { id: string }) => {
    await removeVisitMutation.mutateAsync(visit.id);
    showToast.delete(t("Check in removed."));
  };

  const startEdit = (place: Place) => {
    setSelectedId(place.id);
    setFormError(null);
    setEditor(toEditorState(place));
    setEditorOpen(true);
  };

  const selectPlace = (place: Place) => {
    setPhotoSelection(null);
    if (editor?.id && editor.id !== place.id) return;
    if (editor && !editor.id) {
      setEditor(null);
      setEditorOpen(false);
      setFormError(null);
    }
    setDetailsOpen(saved || selectedId === place.id);
    setSelectedId(place.id);
  };

  /** Moves the temporary marker or starts one at the selected map point. */
  const pickOnMap = (coordinate: PlaceCoordinate, placeName?: string) => {
    if (photoRelocating && selectedPhoto) {
      setPhotoSelection((current) => current?.id === selectedPhoto.id ? { ...current, draft: coordinate } : current);
      return;
    }
    setPhotoSelection(null);
    if (!editor) {
      setSelectedId(null);
      setDetailsOpen(false);
      setFormError(null);
      setEditor({ coordinate, values: { ...emptyValues, name: placeName ?? "" } });
      setEditorOpen(false);
      return;
    }
    setEditor((current) => {
      if (!current) return current;
      const name = !current.values.name.trim() && placeName ? placeName : current.values.name;
      return { ...current, coordinate, values: { ...current.values, name } };
    });
  };

  const cancelMapPick = () => {
    setEditor(null);
    setEditorOpen(false);
    setFormError(null);
  };

  useEffect(() => {
    const cancel = () => {
      if (save.isPending || remove.isPending || home.save.isPending) return;
      cancelMapPick();
      setManualHomePick(false);
      setMoveConfirmationOpen(false);
      setPlaceToMove(null);
      clearPreview();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented
        || document.querySelector('[role="dialog"], [role="alertdialog"], .place__scenes[open]')) return;
      cancel();
    };
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)
        || document.querySelector('[role="dialog"], [role="alertdialog"]')
        || workspaceRef.current?.contains(event.target)
        || (event.target instanceof Element && event.target.closest(".place__notice, .map-navigation, .map-navigation__toolbar"))) return;
      if (editor || manualHomePick || photoSelection) cancel();
    };
    window.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, [editor, manualHomePick, placeToMove, photoSelection, save.isPending, remove.isPending, home.save.isPending, clearPreview]);

  const movePlace = (place: Place, coordinate: PlaceCoordinate) => {
    if (!canChangeMarker(place)) return;
    clearPreview();
    setPlaceToMove({ place, coordinate });
  };

  const deletePlace = (place: Place) => {
    if (!canChangeMarker(place)) return;
    clearPreview();
    setPlaceToDelete(place);
  };

  const confirmMove = async () => {
    if (!placeToMove) return;
    const { place, coordinate } = placeToMove;
    const details = await placeService.get(place.id);
    await save.mutateAsync({
      id: place.id,
      input: { ...toEditorState(details).values, ...coordinate },
    });
    showToast.success(t("Place updated."));
    setMoveConfirmationOpen(false);
    setPlaceToMove(null);
  };

  const submit = async () => {
    if (!editor?.coordinate) return;
    const name = editor.values.name.trim();
    if (!name) {
      setFormError(t("Enter a name for this place."));
      return;
    }

    setFormError(null);
    try {
      const saved = await save.mutateAsync({
        id: editor.id,
        input: {
          ...editor.values,
          name,
          address: editor.values.address.trim(),
          note: editor.values.note.trim(),
          latitude: editor.coordinate.latitude,
          longitude: editor.coordinate.longitude,
        },
      });
      setEditor(null);
      setEditorOpen(false);
      setSelectedId(saved.id);
      showToast.success(t(editor.id ? "Place updated." : "Place saved."));
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("Could not save this place."));
    }
  };

  const confirmDelete = async () => {
    if (!placeToDelete) return;
    await remove.mutateAsync(placeToDelete.id);
    if (selectedId === placeToDelete.id) setSelectedId(null);
    if (editor?.id === placeToDelete.id) setEditor(null);
    showToast.delete(t("Place deleted."));
  };


  return (
    <main className={`place${saved ? " place--saved" : ""}`}>
        <div className="place__content">
          <div className="place__scroll-inner">
            {editor && !editor.coordinate && (
              <div className="place__notice" role="status">
                <span>{t("Click the map, use your current location, or select a place label to set the marker.")}</span>
                <Button type="button" variant="secondary" onClick={cancelMapPick}>
                  {t("Cancel")}
                </Button>
              </div>
            )}
            {manualHomePick && (
              <div className="place__notice" role="status">
                <span>{t("Click the map to set your home location.")}</span>
                <Button type="button" variant="secondary" disabled={home.save.isPending} onClick={cancelHomePick}>
                  {t("Cancel")}
                </Button>
              </div>
            )}

            <PlaceViewSwitch view={view} onChange={requestView} />
            {!saved && (!addToolbar || addToolbar.visible) && <AddNavigationToolbar onAdd={addToolbar?.add ?? (() => {})} disabled={addToolbar?.disabled ?? true} />}
            <div className="place__view-content" aria-busy={view === "history" && visitHistory.isPending || undefined}>
            <>
            {!saved && (
              <>
                {mapPlacesQuery.isError && !places.length ? (
                  <ErrorState message={t("Could not load places.")} onRetry={() => void mapPlacesQuery.refetch()} />
                ) : null}
                <div ref={workspaceRef} className="place__workspace">
                  <div className="place__map-panel">
                    {!mapStartReady ? <MapLoadingOverlay ready={false} className="map-loading-overlay" /> : <Suspense fallback={<MapLoadingOverlay ready={false} className="map-loading-overlay" />}><PlaceMap
                      onAddToolbarChange={setAddToolbar}
                      settingsRef={mapSettings}
                      onBoundsChange={handleMapBounds}
                      places={mapPlaces}
                      photos={photos}
                      selectedPhoto={selectedPhoto}
                      photoRelocating={photoRelocating}
                      canMovePhoto={canMovePhoto}
                      onSelectPhoto={selectPhoto}
                      onMovePhoto={movePhoto}
                      onEditPhoto={(photo) => setPhotoSelection({ id: photo.id, draft: photo.location ?? null, editing: true })}
                      onConfirmPhotoMove={() => setPhotoMoveConfirmationOpen(true)}
                      selectedId={selectedId}
                      draft={photoRelocating ? photoSelection?.draft ?? null : placeToMove?.coordinate ?? editor?.coordinate ?? null}
                      relocatingPlace={placeToMove?.place ?? null}
                      picking={!!editor && !editorOpen}
                      editorOpen={editorOpen}
                      homeLocation={home.query.data ?? null}
                      homeLocationReady={home.query.isFetched}
                      homeActionDisabled={save.isPending || remove.isPending || home.save.isPending || uploading}
                      onAddPhotos={() => void startWithCurrentLocation(() => uploadInput.current?.click())}
                      homePicking={homePicking}
                      onSelect={selectPlace}
                      onEdit={(place) => {
                        void placeService.get(place.id).then(startEdit).catch(() => showToast.error(t("Could not load places.")));
                      }}
                      onEditDraft={() => setEditorOpen(true)}
                      onConfirmRelocation={() => setMoveConfirmationOpen(true)}
                      onCancelRelocation={() => { setMoveConfirmationOpen(false); setPlaceToMove(null); }}
                      onCancelSelection={() => { clearPreview(); setPhotoMoveConfirmationOpen(false); }}
                      onCancelDraft={cancelMapPick}
                      canChange={canChangeMarker}
                      onMove={movePlace}
                      onDelete={deletePlace}
                      onPickHome={(coordinate) => void pickHome(coordinate)}
                      onCreateAtCurrentLocation={(coordinate) => {
                        setSelectedId(null);
                        setDetailsOpen(false);
                        setFormError(null);
                        setEditor({ coordinate, values: { ...emptyValues } });
                        setEditorOpen(true);
                      }}
                      onHomeClick={() => {
                        setPhotoSelection(null);
                        setSelectedId(null);
                        setEditor(null);
                        setEditorOpen(false);
                        setFormError(null);
                        setManualHomePick(false);
                        if (!home.query.data) openHomeDialog();
                      }}
                      onPick={(coordinate, placeName) => {
                        if (photoRelocating && selectedPhoto) setPhotoSelection((current) => current?.id === selectedPhoto.id ? { ...current, draft: coordinate } : current);
                        else if (placeToMove) setPlaceToMove((current) => current ? { ...current, coordinate } : current);
                        else pickOnMap(coordinate, placeName);
                      }}
                    /></Suspense>}
                  </div>
                </div>
                {mapPlacesQuery.isFetchNextPageError ? (
                  <ErrorState message={t("Could not load more places.")} onRetry={() => void mapPlacesQuery.fetchNextPage()} />
                ) : mapPlacesQuery.hasNextPage ? (
                  <div className="place__photo-pages">
                    <span>{t("Showing {count} of {total} places in this area.", {
                      count: places.length, total: mapPlacesQuery.data?.pages[0]?.total ?? places.length,
                    })}</span>
                    <Button type="button" variant="secondary"
                      disabled={mapPlacesQuery.isFetchingNextPage || mapPlacesQuery.isPlaceholderData}
                      onClick={() => void mapPlacesQuery.fetchNextPage()}>
                      {t(mapPlacesQuery.isFetchingNextPage ? "Loading places…" : "Load more places")}
                    </Button>
                  </div>
                ) : null}
                {photosQuery.isError && !photos.length ? (
                  <ErrorState message={t("Could not load photos.")} onRetry={() => void photosQuery.refetch()} />
                ) : photosQuery.isFetchNextPageError ? (
                  <ErrorState message={t("Could not load more photos.")} onRetry={() => void photosQuery.fetchNextPage()} />
                ) : photosQuery.hasNextPage ? (
                  <div className="place__photo-pages">
                    <span>{t("Showing {count} of {total} photos in this area.", {
                      count: photosQuery.data?.pages.reduce((sum, page) => sum + page.items.length, 0) ?? 0,
                      total: photosQuery.data?.pages[0]?.total ?? 0,
                    })}</span>
                    <Button type="button" variant="secondary" disabled={photosQuery.isFetchingNextPage || photosQuery.isPlaceholderData}
                      onClick={() => void photosQuery.fetchNextPage()}>
                      {t(photosQuery.isFetchingNextPage ? "Loading photos…" : "Load more photos")}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
            {saved && (
            view === "history" ? (
              <div className="place__history-panel">
                {visitHistory.isError ? (
                  <ErrorState
                    message={t("Could not load visit history.")}
                    onRetry={() => void visitHistory.refetch()}
                  />
                ) : visitHistory.isPending ? <Spinner /> : visitHistory.data?.items.length ? (
                  <PlaceVisitHistory
                    visits={visitHistory.data.items}
                    onShowOnMap={(visit) => { setSelectedId(visit.placeId); setDetailsOpen(false); requestView("map"); }}
                    showVisitor
                    showVisitorName
                    onRemove={removeVisit}
                    removingVisitId={removeVisitMutation.isPending ? removeVisitMutation.variables : null}
                  />
                ) : (
                  <EmptyState title="No visits yet" hint="Your visit history will appear here after a check-in." />
                )}
              </div>
            ) : query.isLoading ? <Spinner /> : query.isError && !places.length ? (
              <ErrorState message="Could not load places." onRetry={() => void query.refetch()} />
            ) : (
              <>
                {!places.length ? (
                  <EmptyState title={placeSearch || minimumRating ? "No matching places" : "No saved places yet"}
                    hint={placeSearch || minimumRating
                      ? "Try a different search to find a saved place."
                      : "Saved places will appear here."}
                    action={!placeSearch && !minimumRating ? <Button type="button" variant="secondary" onClick={() => requestView("map")}>{t("Open map")}</Button> : undefined} />
                ) : (
                  <>
                    <ul className="place__list">
                      {filteredPlaces.map((place) => (
                        <li key={place.id}>
                          <button
                            type="button"
                            className="place__card"
                            aria-pressed={selectedId === place.id}
                            disabled={!!editor && editor.id !== place.id}
                            onClick={() => selectPlace(place)}
                          >
                            <span
                              className="place__chip"
                              style={{ "--marker-color": place.markerColor } as CSSProperties}
                              aria-hidden="true"
                            >
                              {place.markerIcon}
                            </span>
                            <span className="place__card-body">
                              <strong>{place.name}</strong>
                              {place.address && <small>{place.address}</small>}
                              <StarRating value={place.rating} size="sm" />
                              <small className="place__card-owner">{place.owner.username}</small>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {savedPlaces.isFetchNextPageError ? (
                  <ErrorState message={t("Could not load more places.")}
                    onRetry={() => void savedPlaces.fetchNextPage()} />
                ) : null}
                {savedPlaces.hasNextPage ? (
                  <Button type="button" variant="secondary" disabled={savedPlaces.isFetchingNextPage}
                    onClick={() => void savedPlaces.fetchNextPage()}>
                    {t(savedPlaces.isFetchingNextPage ? "Loading places…" : "Load more places")}
                  </Button>
                ) : null}
              </>
            )
            )}
        {view === "saved" && <PageActionBar className="place__action-bar">
          <form className={`place__search-bar${minimumRating > 0 ? " place__search-bar--rating-filtered" : ""}`} role="search" onSubmit={(event) => event.preventDefault()}>
            <input type="search" aria-label={t("Search saved places")}
              placeholder={t("Search places or users")} value={placeSearch} maxLength={120}
              onChange={(event) => setPlaceSearch(event.target.value)} />
            <div className="place__rating-controls">
              {minimumRating > 0 && (
                <button type="button" className="place__rating-filter-clear" aria-label={t("Clear rating filter")}
                  title={t("Clear rating filter")} onClick={() => setMinimumRating(0)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                </button>
              )}
              <button type="button" className="place__rating-filter" aria-label={t("Filter places by average rating")}
                title={t("Filter places by average rating")} aria-pressed={minimumRating > 0}
                onClick={() => setMinimumRating((rating) => rating === 5 ? 0 : rating + 1)}>
                <SlidingNumber number={minimumRating} aria-hidden="true" />
                <Star size={17} fill="currentColor" aria-hidden="true" />
              </button>
            </div>
            {placeSearch && (
              <>
                <span className="place__search-divider" aria-hidden="true" />
                <button type="button" className="place__search-clear" aria-label={t("Clear search")}
                  title={t("Clear search")} onClick={() => setPlaceSearch("")}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                </button>
              </>
            )}
            <AnimateIcon animateOnHover animateOnTap={false} completeOnStop asChild>
              <span className="place__search-icon" aria-hidden="true">
                <Search size={22} />
              </span>
            </AnimateIcon>
          </form>
        </PageActionBar>}
        {saved && view === "history" && visitHistory.data && historyTotal > 0 && !visitHistory.isError ? (
            <Pagination
              inActionBar
              page={currentHistoryPage}
              pageSize={historyPageSize}
              total={historyTotal}
              itemLabel="visits"
              isFetching={visitHistory.isFetching}
              onPageChange={setHistoryPage}
              onPageSizeChange={(size) => { setHistoryPageSize(size); setHistoryPage(1); }}
            />
        ) : null}
            </>
            </div>

            {editorOpen && editor?.coordinate && (
              <PlaceDialog
                title={t(editor.id ? "Edit place" : "New place")}
                className="place__dialog--editor"
                closeDisabled={save.isPending}
                onClose={() => {
                  if (!save.isPending) {
                    setEditor(null);
                    setEditorOpen(false);
                    setFormError(null);
                  }
                }}
              >
                <PlaceEditor
                  values={editor.values}
                  coordinate={editor.coordinate}
                  saving={save.isPending}
                  isNew={!editor.id}
                  error={formError}
                  onChange={(values) => setEditor((current) => current ? { ...current, values } : current)}
                  onSubmit={() => void submit()}
                  onCancel={() => { setEditor(null); setEditorOpen(false); setFormError(null); }}
                />
              </PlaceDialog>
            )}

            {selected && !editor && detailsOpen && (
              <PlaceDialog
                className="place__dialog--details"
                hideClose
                title={selected.name}
                subtitle={t("Added by {username}", { username: selected.owner.username })}
                icon={
                  <span
                    className="place__chip"
                    style={{ "--marker-color": selected.markerColor } as CSSProperties}
                    aria-hidden="true"
                  >
                    {selected.markerIcon}
                  </span>
                }
                onClose={clearPreview}
              >
                <div>
                  {selected.address && <p className="place__address">{selected.address}</p>}
                  <div className="place__details-rating">
                    <StarRating value={selected.rating} hideReadout />
                    <span className="place__average-rating">
                      {t("{rating} out of 5", { rating: selected.rating.toFixed(1) })}
                    </span>
                  </div>
                  <div className="place__form-actions place__details-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      className="place__check-in-action"
                      busy={checkInMutation.isPending}
                      onClick={() => void checkIn(selected)}
                    >
                      <CalendarCheck size={16} aria-hidden="true" />
                      {t("Check in")}
                    </Button>
                    {canEdit(selected) && (
                      <Button variant="secondary" className="place__edit-action" onClick={() => startEdit(selected)}>
                        <Pencil size={16} aria-hidden="true" />
                        {t("Edit")}
                      </Button>
                    )}
                  </div>
                  <SinglePlaceVisitHistory placeId={selected.id} onShowOnMap={saved ? (visit) => { setSelectedId(visit.placeId); setDetailsOpen(false); requestView("map"); } : undefined} />
                </div>
              </PlaceDialog>
            )}

            {homeDialogOpen && (
              <PlaceDialog
                title={t("Home location")}
                className="place__dialog--home"
                onClose={() => setHomeDialogOpen(false)}
              >
                <div className="place__home-dialog">
                  {home.query.isPending || home.query.isFetching ? (
                    <Spinner />
                  ) : home.query.isError ? (
                    <>
                      <p role="alert">{t("Could not load your home location. Add it manually or retry.")}</p>
                      <div className="place__form-actions">
                        <Button type="button" onClick={startHomePick}>{t("Add manually")}</Button>
                        <Button type="button" variant="secondary" onClick={() => void home.query.refetch()}>
                          {t("Retry")}
                        </Button>
                      </div>
                    </>
                  ) : home.query.data ? (
                    <>
                      <p className="place__coordinate-readout">
                        {home.query.data.latitude.toFixed(6)}, {home.query.data.longitude.toFixed(6)}
                      </p>
                      <div className="place__form-actions">
                        <Button
                          variant="secondary"
                          onClick={startHomePick}
                        >
                          {t("Change home location")}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            setHomeDialogOpen(false);
                            setConfirmHomeRemoval(true);
                          }}
                        >
                          {t("Remove home marker")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{t("Home not set.")}</p>
                      <div className="place__form-actions">
                        <Button
                          onClick={startHomePick}
                        >
                          {t("Add now")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </PlaceDialog>
            )}

            {placeToMove && moveConfirmationOpen && (
              <ConfirmationDialog
                title="Move this place?"
                confirmLabel="Move place"
                onConfirm={confirmMove}
                onClose={() => setMoveConfirmationOpen(false)}
              >
                <p>{t("{name} will move to {latitude}, {longitude}.", {
                  name: placeToMove.place.name,
                  latitude: placeToMove.coordinate.latitude.toFixed(6),
                  longitude: placeToMove.coordinate.longitude.toFixed(6),
                })}</p>
              </ConfirmationDialog>
            )}
            {selectedPhoto && photoRelocating && photoMoveConfirmationOpen && photoSelection?.draft && (
              <ConfirmationDialog
                title="Move this photo?"
                confirmLabel="Move photo"
                onConfirm={confirmPhotoMove}
                onClose={() => setPhotoMoveConfirmationOpen(false)}
              >
                <p>{t("{name} will move to {latitude}, {longitude}.", {
                  name: selectedPhoto.originalFilename,
                  latitude: photoSelection.draft.latitude.toFixed(6),
                  longitude: photoSelection.draft.longitude.toFixed(6),
                })}</p>
              </ConfirmationDialog>
            )}
            {placeToDelete && (
              <ConfirmationDialog
                title="Delete this place?"
                confirmLabel="Delete place"
                danger
                onConfirm={confirmDelete}
                onClose={() => setPlaceToDelete(null)}
              >
                <p>{t("{name} will be removed from the map.", { name: placeToDelete.name })}</p>
              </ConfirmationDialog>
            )}
            {confirmHomeRemoval && (
              <ConfirmationDialog
                title="Remove your home location?"
                confirmLabel="Remove home location"
                danger
                onConfirm={removeHomeLocation}
                onClose={() => setConfirmHomeRemoval(false)}
              >
                <p>{t("The home marker will be removed. You can set it again later.")}</p>
              </ConfirmationDialog>
            )}
            <HomeLocationPhotoConfirmation
              location={home.photosHomeLocation}
              onConfirm={(location) => home.applyToPhotos.mutateAsync(location)}
              onClose={home.dismissPhotosConfirmation}
            />
          </div>
        </div>
    </main>
  );
}
