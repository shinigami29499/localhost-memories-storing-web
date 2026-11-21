import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { cloneMobileSearchFooter, usePageActionBarFooter } from "../../components/layout/PageActionBarCore";
import { showToast } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { useAuthStore } from "../../store/authStore";
import { ApiError } from "../../services/api";
import { useHomeLocation } from "../../features/locations/hooks/useHomeLocation";
import { useLocations } from "../../features/locations/hooks/useLocations";
import { useMapBounds } from "../../features/locations/hooks/useMapBounds";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { inDateRange } from "../../utils/dateRange";
import { cityFromAddress } from "../../features/place/cityFromAddress";
import { locationService } from "../../features/locations/services/locationService";
import { useAnimationStore } from "../../store/animationStore";
import type { PlaceMapSettings } from "../../features/place/components/PlaceMap";
import { placeService } from "../../features/place/services/placeService";
import type { PlaceFormValues } from "../../features/place/components/PlaceEditor";
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

interface EditorState {
  id?: string;
  coordinate: PlaceCoordinate | null;
  values: PlaceFormValues;
}

export const emptyValues: PlaceFormValues = {
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

export type PlaceView = "map" | "saved" | "history";
export interface PlaceViewSwitchProps { view: PlaceView; onChange: (view: PlaceView) => void }
export interface SavedPlacesListProps {
  places: Place[];
  selectedId: string | null;
  editing: boolean;
  editingId?: string;
  onSelect: (place: Place) => void;
}

export function usePlacePageController() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = ["admin", "superadmin"].includes(user?.role?.toLowerCase() ?? "");
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
  return { t, location, isMobile, user, home, view, animationsEnabled, requestView, mapSettings, saved, mapStartReady, setMapStartReady, setHighlightMotionVersion, addToolbar, setAddToolbar, city, setCity, owner, setOwner, dateFrom, setDateFrom, dateTo, setDateTo, hasLocationFilters, placeSearch, setPlaceSearch, minimumRating, historySearch, setHistorySearch, historyMinimumRating, activeRating, setActiveRating, historySentinel, photoSelection, setPhotoSelection, handleMapBounds, photos, photosQuery, savedPlaces, mapPlacesQuery, query, save, remove, checkInMutation, removeVisitMutation, editor, setEditor, editorOpen, setEditorOpen, selectedId, setSelectedId, detailsOpen, setDetailsOpen, visitHistory, historyQuery, historyVisits, formError, setFormError, placeToDelete, setPlaceToDelete, confirmingDetailDeleteId, setConfirmingDetailDeleteId, placeToMove, setPlaceToMove, moveConfirmationOpen, setMoveConfirmationOpen, workspaceRef, manualHomePick, setManualHomePick, homeRelocationDraft, setHomeRelocationDraft, homeMoveConfirmationOpen, setHomeMoveConfirmationOpen, homeDialogOpen, setHomeDialogOpen, confirmHomeRemoval, setConfirmHomeRemoval, photoMoveConfirmationOpen, setPhotoMoveConfirmationOpen, places, filteredPlaces, cityOptions, ownerOptions, homePicking, selected, selectedVisits, selectedPhoto, photoRelocating, canEdit, canChangeMarker, mapPlaces, clearPreview, canMovePhoto, selectPhoto, movePhoto, confirmPhotoMove, pickHome, confirmHomeRelocation, cancelHomePick, startHomePick, openHomeDialog, removeHomeLocation, checkIn, removeVisit, startEdit, selectPlace, pickOnMap, cancelMapPick, movePlace, deletePlace, confirmMove, submit, confirmDelete };
}
