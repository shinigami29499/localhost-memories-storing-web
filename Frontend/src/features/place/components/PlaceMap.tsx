import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type RefObject } from "react";
import Map, { GeolocateControl, Marker, useMap, type MapRef } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import "mapbox-gl/dist/mapbox-gl.css";
import "../../locations/components/mapControls.css";
import { Button, ErrorState, showToast } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { Globe } from "../../../components/animate-ui/icons/globe";
import { Home } from "../../../components/animate-ui/icons/home";
import { Settings } from "../../../components/animate-ui/icons/settings";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import { SlidersHorizontal } from "../../../components/animate-ui/icons/sliders-horizontal";
import { Key } from "../../../components/animate-ui/icons/key";
import { MapPin } from "../../../components/animate-ui/icons/map-pin";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAnimationStore } from "../../../store/animationStore";
import { mediaPreviewUrl } from "../../../utils/media";
import {
  clusterMapMarkers,
  isMarkerInViewport,
  mapMarkersOverlap,
  type MapCoordinate,
  type MapMarkerGroup,
  type MapProjector,
} from "../../../utils/mapMarkerGroups";
import {
  getMapAppearanceConfig,
  MapAppearanceConfig,
  MapAppearanceSettings,
  useMapAppearance,
} from "../../locations/components/MapAppearanceSettings";
import { StarRating } from "./StarRating";
import { PlaceDialog, type PlaceDialogProps } from "./PlaceDialog";
import { LocationSearch } from "../../locations/components/LocationSearch";
import { HomeLocationMarker } from "../../locations/components/HomeLocationMarker";
import { MapLoadingOverlay } from "../../locations/components/MapLoadingOverlay";
import { MapDraftMarker } from "../../locations/components/MapDraftMarker";
import { useHomeMarkerHover } from "../../locations/hooks/useHomeMarkerHover";
import type { LocationSearchResult } from "../../locations/services/locationSearchService";
import { findPlaceAt } from "../../locations/utils/findPlaceAt";
import type { HomeLocation } from "../../locations/types";
import type { PlaceCoordinate, Place } from "../types";
import type { MediaFile } from "../../media/types";
import { PhotoMarkers, type PhotoMarkerPreviewProps } from "../../locations/components/LocationMap";
import { MapNavigation, NavigationToolbar } from "../../navigation/components/MapNavigation";
import { NavigationFallback } from "../../navigation/components/NavigationOptions";
import { usePlace } from "../hooks/usePlaces";
import type { PlaceMapBounds } from "../services/placeService";
import { viewportBounds } from "../../locations/utils/mapBounds";
import { usePlaceMapController, MapViewport, InitialLocationCenter, MapResizer, MapCameraScene, PlaceMarkers, type Props } from "./PlaceMapShared";
export type { PlaceMapSettings, PlaceMarkerPreviewProps } from "./PlaceMapShared";

function MapContent(props: Props & { token: string }) {
  const {
  DialogComponent = PlaceDialog,
  MarkerPreview,
  PhotoMarkerPreview,
  places, photos = [], selectedPhoto, photoRelocating = false, selectedId, draft, picking, editorOpen, relocatingPlace, homeLocation,
  homeLocationReady, homePicking, homeRelocationDraft, homeActionDisabled, onSelect, onPick, onPickHome, onMoveHome, onConfirmHomeRelocation, onCancelHomeRelocation,
  onHomeClick, onCreateAtCurrentLocation, onBrowseAlbums, token,
  canChange, onMove, onDelete, onEdit, onEditDraft, onConfirmRelocation, onCancelRelocation, onCancelSelection, onCancelDraft,
  canMovePhoto, onSelectPhoto, onMovePhoto, onEditPhoto, onConfirmPhotoMove, settingsRef, onBoundsChange, onAddToolbarChange,
} = props;
  const { t, shouldReduceMotion, mapRef, scenesRef, appearanceRef, loaded, setLoaded, failed, setFailed, navigationOpen, setNavigationOpen, mapboxPreview, setMapboxPreview, initialLocationResolved, hasInitialCenter, setHasInitialCenter, scene, setScene, showMarkers, setShowMarkers, showPhotoMarkers, setShowPhotoMarkers, addChoiceOpen, setAddChoiceOpen, mapAppearance, appearanceOpen, setAppearanceOpen, homeRequest, setHomeRequest, homeHovered, onHomeHoverChange, homeSelected, setHomeSelected, markerDragging, setMarkerDragging, focusRequest, setFocusRequest, relocating, photoDraftChanged, mapPlaces, addPlace, focusCoordinate, resolveInitialLocation, selected, selectSearchResult } = usePlaceMapController(props);

  useEffect(() => {
    props.onLoadingSettledChange?.(loaded || failed);
  }, [props.onLoadingSettledChange, loaded, failed]);

  if (failed)
    return <>
      <ErrorState message="The map could not load. Check your connection and try again. Adding places requires the map." onRetry={() => { setLoaded(false); setFailed(false); }} />
      {selected && <NavigationFallback destination={{ ...selected, name: selected.name }} />}
    </>;

  return (
    <div className="place__map map-controls" data-scene={scene} data-mapbox-preview={mapboxPreview} data-relocating={relocating || undefined} role="region" aria-label={t("Places map")}>
      <Map
        style={{ minHeight: "inherit" }}
        ref={mapRef}
        mapboxAccessToken={token}
        attributionControl={false}
        mapStyle="mapbox://styles/mapbox/standard"
        config={{ basemap: getMapAppearanceConfig(mapAppearance.lighting, mapAppearance.colorTheme, scene === "3d") }}
        initialViewState={{ latitude: 20, longitude: 0, zoom: 2, pitch: 0, bearing: 0 }}
        cursor={picking || homePicking || relocating || homeRelocationDraft ? "crosshair" : undefined}
        cooperativeGestures={false}
        onLoad={(event) => {
          event.target.setCooperativeGestures(false);
          setLoaded(true);
          onBoundsChange?.(viewportBounds(event.target.getBounds()));
        }}
        onMoveEnd={(event) => onBoundsChange?.(viewportBounds(event.target.getBounds()))}
        onError={() => setFailed(true)}
        onClick={(event) => {
          if (navigationOpen || scenesRef.current?.open || appearanceRef.current?.open
            || document.querySelector('[role="dialog"], [role="alertdialog"], dialog[open]')) return;
          const place = findPlaceAt(event, "standard");
          const point = place
            ? { latitude: place.latitude, longitude: place.longitude }
            : (() => {
                const wrapped = event.lngLat.wrap();
                return { latitude: wrapped.lat, longitude: wrapped.lng };
              })();
          if (homeRelocationDraft) {
            onMoveHome?.(point);
            return;
          }
          if (homePicking) {
            onPickHome(point);
            return;
          }
          if (photoRelocating) {
            onMovePhoto(selectedPhoto!, point);
            return;
          }
          if (relocating) {
            onPick(point);
            return;
          }
          if (place) {
            onPick(point, place.placeName);
            return;
          }
          onPick(point);
        }}
      >
        <MapAppearanceConfig
          lighting={mapAppearance.lighting}
          colorTheme={mapAppearance.colorTheme}
          show3dObjects={scene === "3d"}
        />
        <GeolocateControl
          key="geolocate-bottom-left"
          position="bottom-left"
          positionOptions={{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }}
          trackUserLocation={false}
          showUserLocation={false}
          onGeolocate={(event) => {
            if (navigationOpen) return;
            const coordinate = {
              latitude: event.coords.latitude,
              longitude: event.coords.longitude,
            };
            if (homeRelocationDraft) onMoveHome?.(coordinate);
            else if (homePicking) onPickHome(coordinate);
            else if (!relocating) onPick(coordinate);
          }}
          onError={() => showToast.error(t("Could not determine your current location. Check location permission and try again."))}
        />
        <InitialLocationCenter
          homeLocation={homeLocation}
          homeLocationReady={homeLocationReady}
          ready={loaded && homeRequest === 0 && !selected}
          onResolved={resolveInitialLocation}
        />
        <MapViewport
          places={places}
          selected={selected}
          ready={loaded && !navigationOpen}
          allowFit={initialLocationResolved && !hasInitialCenter && !draft}
        />
        <MapCameraScene scene={scene} selected={selected}
          draft={selectedPhoto?.location ? { latitude: selectedPhoto.location.latitude, longitude: selectedPhoto.location.longitude } : draft}
          ready={loaded && !navigationOpen}
          homeLocation={homeLocation} homeRequest={homeRequest} focusRequest={focusRequest} />
        <MapResizer />
        {loaded && homeRelocationDraft && (
          <NavigationToolbar editAction="confirm" showNavigate={false} label={t("Home location")}
            onEdit={onConfirmHomeRelocation}
            onCancel={onCancelHomeRelocation} />
        )}
        {loaded && !homeRelocationDraft && !homePicking && (selected && !picking || selectedPhoto && !picking || !selected && !selectedPhoto && (picking || relocating || editorOpen) && draft) && (
          <MapNavigation destination={selected
            ? { latitude: selected.latitude, longitude: selected.longitude, name: selected.name }
            : selectedPhoto ? { latitude: (photoRelocating && draft ? draft : selectedPhoto.location!).latitude, longitude: (photoRelocating && draft ? draft : selectedPhoto.location!).longitude, name: selectedPhoto.originalFilename }
            : { ...draft!, name: relocatingPlace?.name ?? t("New place") }}
            accessToken={token} homeLocation={homeLocation} onMapboxPreviewChange={setMapboxPreview}
            onEdit={selected
              ? canChange(selected) ? () => onEdit(selected) : undefined
              : selectedPhoto ? photoRelocating ? onConfirmPhotoMove : canMovePhoto(selectedPhoto) ? () => onEditPhoto(selectedPhoto) : undefined
              : relocating ? onConfirmRelocation : () => { if (draft) focusCoordinate(draft); onEditDraft(); }}
            onOpenChange={(open) => {
              if (open && !selected && !selectedPhoto && draft) focusCoordinate(draft);
              setNavigationOpen(open);
            }}
            editAction={photoRelocating || relocatingPlace || (!selected && !selectedPhoto) ? "confirm" : "edit"}
            onCancel={photoRelocating ? onCancelSelection : relocatingPlace ? onCancelRelocation : selected || selectedPhoto ? onCancelSelection : onCancelDraft} />
        )}
        {homeLocation && !relocating && (
          <HomeLocationMarker location={homeLocation} variant="place" onHoverChange={onHomeHoverChange} onSelectionChange={setHomeSelected} onDragChange={setMarkerDragging}
            onRelocate={onMoveHome} onClick={() => {
            onHomeClick();
            mapRef.current?.easeTo({
              center: [homeLocation.longitude, homeLocation.latitude],
              zoom: Math.max(mapRef.current.getZoom(), 18),
              pitch: scene === "3d" ? 55 : 0,
              bearing: scene === "3d" ? -20 : 0,
              duration: shouldReduceMotion ? 0 : 400,
            });
          }} />
        )}
        {showMarkers && !photoRelocating && (
          <PlaceMarkers places={mapPlaces} selectedId={selectedId} ready={loaded}
            MarkerPreview={MarkerPreview}
            homeLocation={homeLocation} homeHovered={homeHovered || homeSelected} onHomeHoverChange={onHomeHoverChange}
            hidePreview={mapboxPreview || relocating || !!homeRelocationDraft || markerDragging} hideCount={!!homeRelocationDraft} onDragChange={setMarkerDragging}
            canChange={(place) => !navigationOpen && !relocating && canChange(place)} onMove={onMove} onDelete={onDelete} onSelect={(item) => {
            if (relocating) return;
            setFocusRequest((request) => request + 1);
            onSelect(item);
          }} />
        )}
        {showPhotoMarkers && <PhotoMarkers MarkerPreview={PhotoMarkerPreview}
          media={photoRelocating && selectedPhoto ? photos.filter((item) => item.id === selectedPhoto.id) : photos}
          selected={selectedPhoto} ready={loaded} homeLocation={homeLocation} homeHovered={homeHovered || homeSelected}
          onHomeHoverChange={onHomeHoverChange} hidePreview={mapboxPreview || photoRelocating || !!homeRelocationDraft || markerDragging} hideCount={!!homeRelocationDraft} onDragChange={setMarkerDragging}
          onSelect={(photo) => {
            if (selectedPhoto?.id !== photo.id) setFocusRequest((request) => request + 1);
            onSelectPhoto(photo);
          }}
          canMove={(photo) => !navigationOpen && canMovePhoto(photo)} onMove={onMovePhoto} />}
        {draft && (picking || !!relocatingPlace || photoDraftChanged) && (
          <MapDraftMarker location={draft} label={t("Click the map or drag to set a location")}
            draggable={picking || relocating} onPick={onPick}
            onClick={picking ? onCancelDraft : undefined} />
        )}
        {homeRelocationDraft && <MapDraftMarker location={homeRelocationDraft} label={t("Change home location")}
          draggable={!navigationOpen} onPick={(coordinate) => onMoveHome?.(coordinate)} />}
      </Map>
      {!props.onLoadingSettledChange && <MapLoadingOverlay ready={loaded} className="map-loading-overlay" />}
      <LocationSearch
        disabled={!loaded || navigationOpen}
        onFocus={() => {
          if (window.matchMedia("(max-width: 640px)").matches) {
            if (scenesRef.current) scenesRef.current.open = false;
            if (appearanceRef.current) appearanceRef.current.open = false;
          }
        }}
        onSelect={selectSearchResult}
      />
      {addChoiceOpen && <DialogComponent title={t("Add")} onClose={() => setAddChoiceOpen(false)}>
        <div className="place__add-choices">
          <Button onClick={() => { setAddChoiceOpen(false); onBrowseAlbums(); }}>{t("Go to albums")}</Button>
          <Button onClick={() => { setAddChoiceOpen(false); addPlace(); }}>{t("Add place")}</Button>
        </div>
      </DialogComponent>}
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <button
          type="button"
          className="place__map-home-control"
          aria-label={t(homeLocation ? "Go to home" : "Home location")}
          title={t(homeLocation ? "Go to home" : "Home location")}
          disabled={!loaded || !homeLocationReady || homeActionDisabled}
          onClick={() => {
            if (homeLocation) {
              setHasInitialCenter(true);
              setHomeRequest((request) => request + 1);
              if (scenesRef.current) scenesRef.current.open = false;
              if (appearanceRef.current) appearanceRef.current.open = false;
            }
            onHomeClick();
          }}
        >
          <Home size={18} aria-hidden="true" />
        </button>
      </AnimateIcon>
      <details ref={scenesRef} className="place__scenes" aria-label={t("Map scenes")}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (event.target instanceof Element && event.target.closest("summary")) return;
          if (scenesRef.current) scenesRef.current.open = false;
          if (appearanceRef.current) appearanceRef.current.open = false;
        }}>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <summary
            className="place__scenes-title"
            aria-label={t("Setting")}
            onClick={() => {
              if (appearanceRef.current) appearanceRef.current.open = false;
            }}
          >
            <Settings size={20} aria-hidden="true" />
            <span className="place__scenes-label">{t("Setting")}</span>
            <span className="place__scenes-chevron" aria-hidden="true">
              <ChevronDown size={16} animate={false} />
            </span>
          </summary>
        </AnimateIcon>
        <div className="place__scene-list">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__scene" aria-pressed={scene === "streets"}
              onClick={() => { if (settingsRef) settingsRef.current.scene = "streets"; setScene("streets"); }}>
              <span className="place__scene-icon" aria-hidden="true"><Home size={20} /></span>
              <span className="place__scene-copy"><strong>{t("Street map")}</strong></span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__scene" aria-pressed={scene === "3d"}
              onClick={() => {
                mapAppearance.selectLighting("day");
                mapAppearance.selectColorTheme("default");
                if (settingsRef) settingsRef.current.scene = "3d";
                setScene("3d");
              }}>
              <span className="place__scene-icon" aria-hidden="true"><Globe size={20} animation="spin" /></span>
              <span className="place__scene-copy"><strong>{t("3D Basemap")}</strong></span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__scene" aria-pressed={showPhotoMarkers}
              onClick={() => {
                const next = !showPhotoMarkers;
                if (settingsRef) { settingsRef.current.showPhotoMarkers = next; if (next) settingsRef.current.showMarkers = false; }
                setShowPhotoMarkers(next);
                if (next) setShowMarkers(false);
              }}>
              <span className="place__scene-icon" aria-hidden="true"><MapPin size={20} /></span>
              <span className="place__scene-copy"><strong>{t("Photos")}</strong></span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__scene" aria-pressed={showMarkers}
              onClick={() => {
                const next = !showMarkers;
                if (settingsRef) { settingsRef.current.showMarkers = next; if (next) settingsRef.current.showPhotoMarkers = false; }
                setShowMarkers(next);
                if (next) setShowPhotoMarkers(false);
              }}>
              <span className="place__scene-icon" aria-hidden="true"><Key size={20} /></span>
              <span className="place__scene-copy"><strong>{t("Places")}</strong></span>
            </button>
          </AnimateIcon>
        </div>
      </details>
      <details
        ref={appearanceRef}
        className="place__scenes map-appearance-control"
        aria-label={t("Map appearance")}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (event.target instanceof Element && event.target.closest("summary")) return;
          if (scenesRef.current) scenesRef.current.open = false;
          if (appearanceRef.current) appearanceRef.current.open = false;
        }}
        onToggle={(event) => setAppearanceOpen(event.currentTarget.open)}
      >
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <summary
            className="place__scenes-title"
            aria-label={t("Map appearance")}
            onClick={() => {
              if (scenesRef.current) scenesRef.current.open = false;
            }}
          >
            <SlidersHorizontal size={20} aria-hidden="true" />
            <span>{t("Map appearance")}</span>
            <span className="place__scenes-chevron" aria-hidden="true">
              <ChevronDown size={16} animate={false} />
            </span>
          </summary>
        </AnimateIcon>
        <MapAppearanceSettings {...mapAppearance} isOpen={appearanceOpen} />
      </details>
    </div>
  );
}

export function PlaceMap(props: Props) {
  const { t } = useLocale();
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  useEffect(() => {
    if (!token?.startsWith("pk.")) props.onLoadingSettledChange?.(true);
  }, [token, props.onLoadingSettledChange]);
  if (!token || !token.startsWith("pk.")) {
    const selected = props.places.find((place) => place.id === props.selectedId);
    return <>
      {!token
        ? <p className="place__map-message" role="status">{t("Set VITE_MAPBOX_ACCESS_TOKEN to enable Mapbox. Places can only be placed on the map.")}</p>
        : <ErrorState message="Mapbox requires a public access token starting with pk. Never use a secret token in the frontend." />}
      {selected && <NavigationFallback destination={{ ...selected, name: selected.name }} />}
    </>;
  }
  return <MapContent key={token} {...props} token={token} />;
}
