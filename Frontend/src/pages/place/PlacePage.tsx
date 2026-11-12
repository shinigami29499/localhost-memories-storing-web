import { PushTransition } from "../../hooks/PushTransition";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo, type CSSProperties } from "react";
import { HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { NavigationHighlight, SwapLabel } from "../../components/ui";
import { PageHighlightBar } from "../../components/ui/PageHighlightBar";
import { cloneMobileSearchFooter, PageActionBar, usePageActionBarFooter } from "../../components/layout/PageActionBar";
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
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { HeaderFilters, inDateRange } from "../../components/ui/HeaderFilters";
import { cityFromAddress } from "../../features/place/cityFromAddress";
import { uploadService } from "../../features/uploads/services/uploadService";
import { registerUploadCompletionAction } from "../../features/uploads/services/uploadRuntime";
import { locationService } from "../../features/locations/services/locationService";
import { locateUploadedBatch } from "../../features/locations/services/locateUploadedBatch";
import { LocationEditor } from "../../features/locations/components/LocationEditor";
import { useAnimationStore } from "../../store/animationStore";
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
import {
  useCheckInPlace,
  useDeletePlace,
  useDeletePlaceVisit,
  useInfinitePlaceVisitHistory,
  usePlaceVisitHistory,
  useInfinitePlaces,
  usePlaces,
  useInfiniteMapPlaces,
  usePlace,
  usePlaceVisits,
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
        {([ ["map", "Map"], ["saved", "Saved"], ["history", "History"] ] as const).map(([value, label], index) => (
          <HighlightItem key={value} value={value} asChild>
            <button type="button" aria-pressed={view === value}
              onClick={() => onChange(value)}>
              <SwapLabel text={t(label)} index={index} />
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
  const isMobile = useMediaQuery("(max-width: 767px)");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const home = useHomeLocation(user?.id);
  const view: PlaceView = location.pathname.replace(/\/$/, "").endsWith("/saved") ? "saved"
    : location.pathname.replace(/\/$/, "").endsWith("/history") ? "history" : "map";
  const actionBarFooter = usePageActionBarFooter();
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const viewTransition = useRef<{ sequence: number; animation?: Animation; entering: boolean; exit?: HTMLElement }>({ sequence: 0, entering: false });
  const [entryVersion, setEntryVersion] = useState(0);
  const requestView = useCallback((nextView: PlaceView) => {
    if (view !== "map" && nextView !== "map") {
      if (nextView !== view) startTransition(() => { void navigate(`/location/${nextView}`); });
      return;
    }
    const sequence = ++viewTransition.current.sequence;
    viewTransition.current.animation?.cancel();
    viewTransition.current.exit?.remove();
    viewTransition.current.exit = undefined;
    viewTransition.current.entering = false;
    const footer = actionBarFooter;
    footer?.removeAttribute("data-location-view-transition");
    if (nextView === view) return;
    const go = () => startTransition(() => { void navigate(nextView === "map" ? "/location" : `/location/${nextView}`); });
    if (!footer || !animationsEnabled || !window.matchMedia("(max-width: 767px)").matches
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      go();
      return;
    }
    const current = footer.querySelector<HTMLElement>(view === "map" ? ".page-action-bar__item > .map-navigation__toolbar" : ".page-action-bar__item > .place__action-bar");
    const bounds = current?.getBoundingClientRect();
    const exiting = current && bounds ? (view === "map" ? current.cloneNode(true) as HTMLElement : cloneMobileSearchFooter(footer, current, bounds)) : undefined;
    if (exiting && bounds) {
      exiting.dataset.locationViewExit = "true";
      exiting.setAttribute("aria-hidden", "true");
      exiting.inert = true;
      if (view === "map") {
        Object.assign(exiting.style, { position: "fixed", left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px`, maxWidth: "none", margin: "0", pointerEvents: "none", zIndex: "2" });
        footer.append(exiting);
      }
      viewTransition.current.exit = exiting;
    }
    footer.dataset.locationViewTransition = "closing";
    const animation = exiting?.animate(view === "map"
        ? [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 0 100%)" }]
        : [{ transform: "translateY(0)" }, { transform: "translateY(100%)" }],
      { duration: 200, easing: "ease-in", fill: "forwards" });
    viewTransition.current.animation = animation;
    go();
    void (animation?.finished.catch(() => undefined) ?? Promise.resolve()).then(() => new Promise<void>((resolve) => window.setTimeout(resolve, 50))).then(() => {
      if (viewTransition.current.sequence !== sequence) return;
      exiting?.remove();
      viewTransition.current.exit = undefined;
      viewTransition.current.entering = true;
      setEntryVersion((version) => version + 1);
    });
  }, [actionBarFooter, animationsEnabled, navigate, view]);
  useEffect(() => () => {
    viewTransition.current.sequence++;
    viewTransition.current.animation?.cancel();
    viewTransition.current.exit?.remove();
    actionBarFooter?.removeAttribute("data-location-view-transition");
  }, [actionBarFooter]);
  useLayoutEffect(() => {
    if (!viewTransition.current.entering || !actionBarFooter) return;
    viewTransition.current.entering = false;
    const sequence = viewTransition.current.sequence;
    const footer = actionBarFooter;
    let frame = requestAnimationFrame(() => {
      const incoming = actionBarFooter.querySelector<HTMLElement>(view === "map" ? ".map-navigation__toolbar" : ".place__action-bar");
      viewTransition.current.animation?.cancel();
      footer.dataset.locationViewTransition = "entering";
      const animation = (view === "map" ? incoming : footer)?.animate(view === "map"
        ? [{ clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0)" }]
        : [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }],
      { duration: 200, easing: "ease-out" });
      viewTransition.current.animation = animation;
      void (animation?.finished.catch(() => undefined) ?? Promise.resolve()).then(() => {
        if (viewTransition.current.sequence === sequence) footer?.removeAttribute("data-location-view-transition");
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [actionBarFooter, entryVersion, view]);
  const mapSettings = useRef<PlaceMapSettings>({ scene: "3d", showMarkers: true, showPhotoMarkers: false });
  const saved = view !== "map";
  const [mapStartReady, setMapStartReady] = useState(!animationsEnabled);
  const [highlightMotionVersion, setHighlightMotionVersion] = useState(0);
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
        const elements = [document.querySelector(highlightMotionVersion ? ".place__scroll-inner > .page-highlight" : ".place__view-switch"), actionBarFooter];
        const animations = elements.flatMap((element) => element?.getAnimations({ subtree: true }) ?? [])
          .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
        void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
          if (!cancelled) pause = window.setTimeout(() => setMapStartReady(true), 150);
        });
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); window.clearTimeout(pause); };
  }, [actionBarFooter, animationsEnabled, highlightMotionVersion, mapStartReady, saved]);
  const [savedCity, setSavedCity] = useState("");
  const [savedOwner, setSavedOwner] = useState("");
  const [savedDateFrom, setSavedDateFrom] = useState("");
  const [savedDateTo, setSavedDateTo] = useState("");
  const [historyCity, setHistoryCity] = useState("");
  const [historyOwner, setHistoryOwner] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const city = view === "history" ? historyCity : savedCity;
  const setCity = view === "history" ? setHistoryCity : setSavedCity;
  const owner = view === "history" ? historyOwner : savedOwner;
  const setOwner = view === "history" ? setHistoryOwner : setSavedOwner;
  const dateFrom = view === "history" ? historyDateFrom : savedDateFrom;
  const setDateFrom = view === "history" ? setHistoryDateFrom : setSavedDateFrom;
  const dateTo = view === "history" ? historyDateTo : savedDateTo;
  const setDateTo = view === "history" ? setHistoryDateTo : setSavedDateTo;
  const hasLocationFilters = saved && !isMobile && (!!city || !!owner || !!dateFrom || !!dateTo);
  const [placeSearch, setPlaceSearch] = useState("");
  const debouncedSearch = useDebouncedValue(placeSearch);
  const [minimumRating, setMinimumRating] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const [historyMinimumRating, setHistoryMinimumRating] = useState(0);
  const activeRating = view === "history" ? historyMinimumRating : minimumRating;
  const setActiveRating = view === "history" ? setHistoryMinimumRating : setMinimumRating;
  const historySentinel = useRef<HTMLDivElement>(null);
  const [photoSelection, setPhotoSelection] = useState<{ id: string; draft: PickedLocation | null; editing: boolean } | null>(null);
  const { bounds: mapBounds, update: handleMapBounds } = useMapBounds();
  const { media: photos, query: photosQuery } = useLocations(!saved, photoSelection ? [photoSelection.id] : [], mapBounds);
  const [uploading, setUploading] = useState(false);
  const uploadInFlight = useRef(false);
  const uploadLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const savedPlaces = useInfinitePlaces(view === "saved" && !hasLocationFilters, debouncedSearch, minimumRating);
  const allPlaces = usePlaces(view === "saved" && !isMobile);
  const mapPlacesQuery = useInfiniteMapPlaces(!saved, mapBounds);
  const query = saved ? (hasLocationFilters ? allPlaces : savedPlaces) : mapPlacesQuery;
  const save = useSavePlace();
  const remove = useDeletePlace();
  const checkInMutation = useCheckInPlace();
  const removeVisitMutation = useDeletePlaceVisit();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => !saved ? (location.state as { focusPlaceId?: string } | null)?.focusPlaceId ?? null : null);
  const selectedPlaceQuery = usePlace(selectedId, !saved);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const visitHistory = useInfinitePlaceVisitHistory(view === "history" && !historySearch.trim() && !historyMinimumRating && !hasLocationFilters);
  const searchHistory = usePlaceVisitHistory(view === "history" && (!isMobile || !!historySearch.trim() || historyMinimumRating > 0));
  const historyQuery = historySearch.trim() || historyMinimumRating || hasLocationFilters ? searchHistory : visitHistory;
  const historyVisits = historySearch.trim() || historyMinimumRating || hasLocationFilters
    ? (searchHistory.data ?? []).filter((visit) => visit.rating >= historyMinimumRating && [visit.placeName, visit.placeAddress, visit.username].some((value) => value.toLowerCase().includes(historySearch.trim().toLowerCase())) && (!hasLocationFilters || ((!city || ((visit.placeCity || cityFromAddress(visit.placeAddress)) || "__unknown") === city) && (!owner || visit.userId === owner) && inDateRange(visit.visitedAt, dateFrom, dateTo))))
    : visitHistory.data?.pages.flatMap((page) => page.items) ?? [];
  useEffect(() => {
    const target = historySentinel.current;
    if (!target || !visitHistory.hasNextPage || visitHistory.isFetchingNextPage || visitHistory.isFetchNextPageError || historySearch.trim() || historyMinimumRating || hasLocationFilters) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void visitHistory.fetchNextPage();
    }, { root: target.closest(".place__view-content"), rootMargin: "200px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [view, historySearch, historyMinimumRating, hasLocationFilters, visitHistory.hasNextPage, visitHistory.isFetchingNextPage, visitHistory.isFetchNextPageError, visitHistory.fetchNextPage]);
  const [formError, setFormError] = useState<string | null>(null);
  const [placeToDelete, setPlaceToDelete] = useState<Place | null>(null);
  const [confirmingDetailDeleteId, setConfirmingDetailDeleteId] = useState<string | null>(null);
  const [placeToMove, setPlaceToMove] = useState<{ place: Place; coordinate: PlaceCoordinate } | null>(null);
  const [moveConfirmationOpen, setMoveConfirmationOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [manualHomePick, setManualHomePick] = useState(false);
  const [homeRelocationDraft, setHomeRelocationDraft] = useState<PlaceCoordinate | null>(null);
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
    ? hasLocationFilters ? allPlaces.data ?? [] : savedPlaces.data?.pages.flatMap((page) => page.items) ?? []
    : mapPlacesQuery.data?.pages.flatMap((page) => page.items) ?? [], [saved, hasLocationFilters, allPlaces.data, savedPlaces.data, mapPlacesQuery.data]);
  const filteredPlaces = hasLocationFilters ? places.filter((place) => (!city || ((place.city || cityFromAddress(place.address)) || "__unknown") === city) && (!owner || place.owner.id === owner) && inDateRange(place.lastCheckInAt ?? "", dateFrom, dateTo) && place.rating >= minimumRating && [place.name, place.address, place.owner.username].some((value) => value.toLowerCase().includes(placeSearch.trim().toLowerCase()))) : places;
  const filterItems = view === "history" ? (searchHistory.data ?? []).map((visit) => ({ city: visit.placeCity || cityFromAddress(visit.placeAddress), id: visit.userId, username: visit.username })) : (allPlaces.data ?? []).map((place) => ({ city: place.city || cityFromAddress(place.address), id: place.owner.id, username: place.owner.username }));
  const cityOptions = [...new Set(filterItems.map((item) => item.city || "__unknown"))].sort().map((value) => ({ value, label: value === "__unknown" ? t("Unknown city") : value }));
  const ownerOptions = [...new Map(filterItems.map((item) => [item.id, { value: item.id, label: item.username }])).values()].sort((a, b) => a.label.localeCompare(b.label));
  const homePicking = manualHomePick;
  const selected = saved ? places.find((place) => place.id === selectedId) : selectedPlaceQuery.data;
  const selectedVisits = usePlaceVisits(detailsOpen ? selected?.id ?? "" : "");
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


  const headerActions = document.getElementById("page-header-actions");
  const searchForm = (
          <form className={`place__search-bar${isMobile ? "" : " place__search-bar--header"}${activeRating > 0 ? " place__search-bar--rating-filtered" : ""}`} role="search" onSubmit={(event) => event.preventDefault()}>
            <input type="search" aria-label={t(view === "history" ? "Search visit history" : "Search saved places")}
              placeholder={t("Search places or users")} value={view === "history" ? historySearch : placeSearch} maxLength={120}
              onChange={(event) => view === "history" ? setHistorySearch(event.target.value) : setPlaceSearch(event.target.value)} />
            <div className="place__rating-controls" style={{ flexBasis: `${40 + Math.max(0, activeRating - 1) * 8}px` }}>
              {activeRating > 0 && (
                <button type="button" className="place__rating-filter-clear" aria-label={t("Clear rating filter")}
                  title={t("Clear rating filter")} onClick={() => setActiveRating(0)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                </button>
              )}
              <button type="button" className="place__rating-filter" aria-label={`${t("Filter places by average rating")}: ${activeRating}`}
                title={t("Filter places by average rating")} aria-pressed={activeRating > 0}
                onClick={() => setActiveRating((rating) => rating === 5 ? 0 : rating + 1)}>
                {Array.from({ length: Math.max(1, activeRating) }, (_, index) => (
                  <Star key={index} className={animationsEnabled ? "place__rating-star--animated" : undefined}
                    size={20} fill={activeRating > 0 ? "currentColor" : "none"} aria-hidden="true" />
                ))}
              </button>
            </div>
            {(view === "history" ? historySearch : placeSearch) && (
              <>
                <span className="place__search-divider" aria-hidden="true" />
                <button type="button" className="place__search-clear" aria-label={t("Clear search")}
                  title={t("Clear search")} onClick={() => view === "history" ? setHistorySearch("") : setPlaceSearch("")}>
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
  );

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

            <PageHighlightBar id="place-navigation" label="location navigation" onToggle={() => {
              if (!saved && animationsEnabled && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                setMapStartReady(false);
                setHighlightMotionVersion((version) => version + 1);
              }
            }}><PlaceViewSwitch view={view} onChange={requestView} /></PageHighlightBar>
            {!saved && !homeRelocationDraft && (!addToolbar || addToolbar.visible) && <AddNavigationToolbar onAdd={addToolbar?.add ?? (() => {})} disabled={addToolbar?.disabled ?? true} />}
            <div className="place__view-content" data-push-page-content aria-busy={view === "history" && historyQuery.isPending || undefined}>
            <PushTransition transitionKey={view} />
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
                      homeRelocationDraft={homeRelocationDraft}
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
                      onPickHome={pickHome}
                      onMoveHome={(coordinate) => {
                        clearPreview();
                        setEditor(null);
                        setEditorOpen(false);
                        setManualHomePick(false);
                        setHomeRelocationDraft(coordinate);
                      }}
                      onConfirmHomeRelocation={() => setHomeMoveConfirmationOpen(true)}
                      onCancelHomeRelocation={() => { setHomeMoveConfirmationOpen(false); setHomeRelocationDraft(null); }}
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
                {historyQuery.isError && !historyVisits.length ? (
                  <ErrorState
                    message={t("Could not load visit history.")}
                    onRetry={() => void historyQuery.refetch()}
                  />
                ) : historyQuery.isPending ? <Spinner page /> : historyVisits.length ? (
                  <PlaceVisitHistory
                    visits={historyVisits}
                    onShowOnMap={(visit) => { setSelectedId(visit.placeId); setDetailsOpen(false); requestView("map"); }}
                    showVisitor
                    showVisitorName
                    onRemove={removeVisit}
                    removingVisitId={removeVisitMutation.isPending ? removeVisitMutation.variables : null}
                  />
                ) : (
                  <EmptyState title={historySearch || historyMinimumRating || hasLocationFilters ? "No matching places" : "No visits yet"} hint={historySearch || historyMinimumRating || hasLocationFilters ? "Try a different search to find a visit." : "Your visit history will appear here after a check-in."} />
                )}
                {!historySearch.trim() && !historyMinimumRating && !hasLocationFilters && visitHistory.isFetchNextPageError && <ErrorState message={t("Could not load more visits.")} onRetry={() => void visitHistory.fetchNextPage()} />}
                {!historySearch.trim() && !historyMinimumRating && !hasLocationFilters && visitHistory.hasNextPage && <div ref={historySentinel}>{visitHistory.isFetchingNextPage && <Spinner />}</div>}
              </div>
            ) : query.isLoading ? <Spinner page /> : query.isError && !places.length ? (
              <ErrorState message="Could not load places." onRetry={() => void query.refetch()} />
            ) : (
              <>
                {!filteredPlaces.length ? (
                  <EmptyState title={placeSearch || minimumRating || hasLocationFilters ? "No matching places" : "No saved places yet"}
                    hint={placeSearch || minimumRating || hasLocationFilters
                      ? "Try a different search to find a saved place."
                      : "Saved places will appear here."}
                    action={!placeSearch && !minimumRating && !hasLocationFilters ? <Button type="button" variant="secondary" onClick={() => requestView("map")}>{t("Open map")}</Button> : undefined} />
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
                              <strong className="place__card-name">{place.name}</strong>
                              {isMobile ? <>
                                {place.address && <small>{place.address}</small>}
                                <StarRating value={place.rating} size="sm" />
                                <small className="place__card-owner">{place.owner.username}</small>
                              </> : <>
                                <small className="place__card-city">{t("at {city}", { city: "{city}" }).split("{city}").map((part, index) => index === 0 ? part : <span key={index}><strong>{place.city || cityFromAddress(place.address) || t("Unknown city")}</strong>{part}</span>)}</small>
                                <small className="place__card-owner">{t("by {user}", { user: "{user}" }).split("{user}").map((part, index) => index === 0 ? part : <span key={index}><strong>{place.owner.username}</strong>{part}</span>)}</small>
                                <StarRating value={place.rating} size="sm" />
                              </>}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {!hasLocationFilters && savedPlaces.isFetchNextPageError ? (
                  <ErrorState message={t("Could not load more places.")}
                    onRetry={() => void savedPlaces.fetchNextPage()} />
                ) : null}
                {!hasLocationFilters && savedPlaces.hasNextPage ? (
                  <Button type="button" variant="secondary" disabled={savedPlaces.isFetchingNextPage}
                    onClick={() => void savedPlaces.fetchNextPage()}>
                    {t(savedPlaces.isFetchingNextPage ? "Loading places…" : "Load more places")}
                  </Button>
                ) : null}
              </>
            )
            )}
        {saved && (isMobile ? <PageActionBar className="place__action-bar">{searchForm}</PageActionBar>
          : headerActions ? createPortal(<div className="header-search-controls">{searchForm}<HeaderFilters selects={[{ label: "City", value: city, onChange: setCity, options: cityOptions }, { label: "User", value: owner, onChange: setOwner, options: ownerOptions }]} date={{ label: view === "history" ? "Visited" : "Last check-in", from: dateFrom, to: dateTo, setFrom: setDateFrom, setTo: setDateTo }} /></div>, headerActions) : searchForm)}
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
                onClose={() => { setConfirmingDetailDeleteId(null); clearPreview(); }}
              >
                <div>
                  {selected.address && <p className="place__address">{selected.address}</p>}
                  <div className="place__details-rating">
                    <span className="place__average-rating">{selected.rating.toFixed(1)}</span>
                    <StarRating value={selected.rating} hideReadout />
                    {selectedVisits.data && <span className="place__check-in-count">
                      {t(selectedVisits.data.total === 1 ? "{count} check-in" : "{count} check-ins", { count: selectedVisits.data.total })}
                    </span>}
                  </div>
                  <div className="place__form-actions place__details-check-in">
                    <Button
                      type="button"
                      className="dialog-action dialog-action--normal place__check-in-action"
                      busy={checkInMutation.isPending}
                      onClick={() => void checkIn(selected)}
                    >
                      <CalendarCheck size={16} aria-hidden="true" />
                      {t("Check in")}
                    </Button>
                  </div>
                  <SinglePlaceVisitHistory placeId={selected.id} onShowOnMap={saved ? (visit) => { setSelectedId(visit.placeId); setDetailsOpen(false); requestView("map"); } : undefined} />
                  {canEdit(selected) && (
                    <>
                      <div className="dialog-actions place__details-actions">
                        {confirmingDetailDeleteId === selected.id ? <>
                          <Button type="button" variant="danger" className="dialog-action dialog-action--danger" autoFocus disabled={remove.isPending}
                            onClick={() => setConfirmingDetailDeleteId(null)}>{t("Cancel")}</Button>
                          <Button type="button" variant="danger" className="dialog-action dialog-action--danger-confirm" busy={remove.isPending}
                            onClick={() => void remove.mutateAsync(selected.id).then(() => {
                              setConfirmingDetailDeleteId(null);
                              clearPreview();
                              showToast.delete(t("Place deleted."));
                            }).catch((error: unknown) => {
                              showToast.error(error instanceof ApiError ? error.message : t("Could not complete this action. Please retry."));
                            })}>{t("Delete place")}</Button>
                        </> : <>
                          <Button type="button" variant="danger" className="dialog-action dialog-action--danger" onClick={() => setConfirmingDetailDeleteId(selected.id)}>
                            {t("Delete")}
                          </Button>
                          <Button type="button" className="dialog-action dialog-action--normal place__edit-action" onClick={() => startEdit(selected)}>
                            <Pencil size={16} aria-hidden="true" />
                            {t("Edit")}
                          </Button>
                        </>}
                      </div>
                      {confirmingDetailDeleteId === selected.id && <p className="dialog-actions__note place__details-delete-note">
                        {t("{name} will be removed from the map.", { name: selected.name })}
                      </p>}
                    </>
                  )}
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
                        <Button type="button" className="dialog-action dialog-action--normal" onClick={startHomePick}>{t("Add manually")}</Button>
                        <Button type="button" className="dialog-action dialog-action--normal" onClick={() => void home.query.refetch()}>
                          {t("Retry")}
                        </Button>
                      </div>
                    </>
                  ) : home.query.data ? (
                    <>
                      <p className="place__coordinate-readout">
                        {home.query.data.latitude.toFixed(6)}, {home.query.data.longitude.toFixed(6)}
                      </p>
                      <div className="dialog-actions">
                        <Button
                          variant="danger"
                          className="dialog-action dialog-action--danger"
                          onClick={() => {
                            setHomeDialogOpen(false);
                            setConfirmHomeRemoval(true);
                          }}
                        >
                          {t("Remove home marker")}
                        </Button>
                        <Button
                          className="dialog-action dialog-action--normal"
                          onClick={startHomePick}
                        >
                          {t("Change home location")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{t("Home not set.")}</p>
                      <div className="place__form-actions">
                        <Button
                          className="dialog-action dialog-action--normal"
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
          </div>
        </div>
    </main>
  );
}
