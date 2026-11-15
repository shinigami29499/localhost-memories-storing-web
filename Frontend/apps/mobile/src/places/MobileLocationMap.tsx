import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
import Map, { GeolocateControl, Marker, useMap, type MapRef } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { useAnimationStore } from "@/store/animationStore";
import "mapbox-gl/dist/mapbox-gl.css";
import "./mobile-map-controls.css";
import { ErrorState, showToast } from "@/components/ui";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { MapPin } from "@/components/animate-ui/icons/map-pin";
import { Camera } from "@/components/animate-ui/icons/camera";
import { Globe } from "@/components/animate-ui/icons/globe";
import { Home } from "@/components/animate-ui/icons/home";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Settings } from "@/components/animate-ui/icons/settings";
import { SlidersHorizontal } from "@/components/animate-ui/icons/sliders-horizontal";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import {
  getMapAppearanceConfig,
  MapAppearanceConfig,
  useMapAppearance,
} from "@/features/locations/components/mapAppearance";
import { MobileMapAppearanceSettings as MapAppearanceSettings } from "./MobileMapAppearanceSettings";
import { MobileLocationSearch as LocationSearch } from "./MobileLocationSearch";
import { useHomeMarkerHover } from "@/features/locations/hooks/useHomeMarkerHover";
import { MobileHomeLocationMarker as HomeLocationMarker } from "./MobileHomeLocationMarker";
import { MobileMapLoadingOverlay as MapLoadingOverlay } from "./MobileMapLoadingOverlay";
import { MobileMapDraftMarker as MapDraftMarker } from "./MobileMapDraftMarker";
import { MobilePhotoPin } from "./MobilePhotoPin";
import { MobilePhotoClusterMarker } from "./MobilePhotoClusterMarker";
import type { LocationSearchResult } from "@/features/locations/services/locationSearchService";
import { useLocale } from "@/context/LocaleContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { mediaPreviewUrl } from "@/utils/media";
import { clusterMapMarkers, isMarkerInViewport, mapMarkersOverlap, type MapProjector } from "@/utils/mapMarkerGroups";
import type { MediaFile, PhotoLocation, PickedLocation } from "@/features/media/types";
import { findPlaceAt } from "@/features/locations/utils/findPlaceAt";
import type { HomeLocation } from "@/features/locations/types";
import type { MapBounds } from "@/features/locations/types";
import { viewportBounds } from "@/features/locations/utils/mapBounds";
import { DisabledNavigationToolbar, MapNavigation, NavigationToolbar } from "./MobileMapNavigation";
import { MobileNavigationFallback as NavigationFallback } from "./MobileNavigationOptions";
import { useLocationMapController, MapViewport, InitialLocationCenter, MapResizer, MapCameraScene, PhotoMarkers, type Props } from "@/features/locations/components/LocationMapShared";

function MapContent(props: Props & { token: string }) {
  const {
  MarkerPreview,
  media, selected, focused, draft, editable, editing, relocating, onConfirmRelocation, homeLocation, homeLocationReady, homePicking, homeRelocationDraft, homeActionDisabled,
  onSelect, onEdit, onCancelSelection, canMove, onMove, onPick, onPickHome, onMoveHome, onConfirmHomeRelocation, onCancelHomeRelocation, onHomeClick, onAddPhotos, onOpenCamera, onBoundsChange, token,
} = props;
  const { t, shouldReduceMotion, isMobile, mapRef, scenesRef, appearanceRef, loaded, setLoaded, failed, setFailed, navigationOpen, setNavigationOpen, mapboxPreview, setMapboxPreview, mapStyle, setMapStyle, showMarkers, setShowMarkers, mapAppearance, appearanceOpen, setAppearanceOpen, homeRequest, setHomeRequest, homeHovered, onHomeHoverChange, homeSelected, setHomeSelected, markerDragging, setMarkerDragging, focusRequest, setFocusRequest, initialLocationResolved, hasInitialCenter, setHasInitialCenter, markerMedia, draftDiffers, cameraTarget, resolveInitialLocation, selectSearchResult } = useLocationMapController(props);

  if (failed)
    return <>
      <ErrorState message="The map could not load. Check your connection and try again. Setting photo locations requires the map." onRetry={() => setFailed(false)} />
      {selected?.location && <NavigationFallback destination={{ ...selected.location, name: selected.originalFilename }} />}
    </>;

  return (
    <div className="locations__map map-controls" data-scene={mapStyle} data-mapbox-preview={mapboxPreview} data-relocating={relocating || undefined} role="region" aria-label={t("Photo locations")}>
      <Map
        style={{ minHeight: "inherit" }}
        ref={mapRef}
        mapboxAccessToken={token}
        attributionControl={false}
        mapStyle="mapbox://styles/mapbox/standard"
        config={{ basemap: getMapAppearanceConfig(mapAppearance.lighting, mapAppearance.colorTheme, mapStyle === "3d") }}
        initialViewState={{ latitude: 20, longitude: 0, zoom: 2, pitch: 0, bearing: 0 }}
        cursor={!navigationOpen && (editable || homePicking || homeRelocationDraft) ? "crosshair" : undefined}
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
          const point = event.lngLat.wrap();
          const location = place ?? { latitude: point.lat, longitude: point.lng };
          if (homeRelocationDraft) onMoveHome?.(location);
          else if (homePicking) onPickHome(location);
          else if (editable) onPick(location);
        }}
      >
        <MapAppearanceConfig
          lighting={mapAppearance.lighting}
          colorTheme={mapAppearance.colorTheme}
          show3dObjects={mapStyle === "3d"}
        />
        <GeolocateControl
          key="geolocate-bottom-left"
          position="bottom-left"
          positionOptions={{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }}
          trackUserLocation={false}
          showUserLocation={false}
          onGeolocate={(event) => {
            if (navigationOpen) return;
            const location = {
              latitude: event.coords.latitude,
              longitude: event.coords.longitude,
            };
            if (homeRelocationDraft) onMoveHome?.(location);
            else if (homePicking) onPickHome(location);
            else if (editable) onPick(location);
          }}
          onError={() => showToast.error(t("Could not determine your current location. Check location permission and try again."))}
        />
        <InitialLocationCenter
          homeLocation={homeLocation}
          homeLocationReady={homeLocationReady}
          ready={loaded && homeRequest === 0 && !cameraTarget?.location}
          onResolved={resolveInitialLocation}
        />
        <MapViewport
          media={media}
          selected={cameraTarget}
          ready={loaded && !navigationOpen}
          allowFit={initialLocationResolved && !hasInitialCenter}
        />
        <MapCameraScene scene={mapStyle} selected={cameraTarget} ready={loaded && !navigationOpen}
          homeLocation={homeLocation} homeRequest={homeRequest} focusRequest={focusRequest} />
        <MapResizer />
        {loaded && homeRelocationDraft && (
          <NavigationToolbar editAction="confirm" showNavigate={false} label={t("Home location")}
            onEdit={onConfirmHomeRelocation}
            onCancel={onCancelHomeRelocation} />
        )}
        {loaded && !homeRelocationDraft && selected?.location && !homePicking && (
          <MapNavigation destination={{ ...(relocating && draft ? draft : selected.location), name: selected.originalFilename }} accessToken={token}
            homeLocation={homeLocation}
            onEdit={relocating ? onConfirmRelocation : canMove(selected) ? () => onEdit(selected) : undefined}
            editAction={relocating ? "confirm" : "edit"} onCancel={onCancelSelection}
            onOpenChange={setNavigationOpen} onMapboxPreviewChange={setMapboxPreview} />
        )}
        {(!loaded || !homeRelocationDraft && (!selected?.location || homePicking)) && <DisabledNavigationToolbar />}
        {homeLocation && !relocating && (
          <HomeLocationMarker location={homeLocation} variant="locations" onHoverChange={onHomeHoverChange} onSelectionChange={setHomeSelected} onDragChange={setMarkerDragging}
            onRelocate={onMoveHome} onClick={() => {
            onHomeClick();
            mapRef.current?.easeTo({
              center: [homeLocation.longitude, homeLocation.latitude],
              zoom: Math.max(mapRef.current.getZoom(), 18),
              pitch: mapStyle === "3d" ? 55 : 0,
              bearing: mapStyle === "3d" ? -20 : 0,
              duration: shouldReduceMotion ? 0 : 400,
            });
          }} />
        )}
        {showMarkers && <PhotoMarkers ClusterComponent={MobilePhotoClusterMarker} PinComponent={MobilePhotoPin} MarkerPreview={MarkerPreview} homeLocation={homeLocation} homeHovered={homeHovered || homeSelected} onHomeHoverChange={onHomeHoverChange} media={markerMedia} selected={selected} ready={loaded} hidePreview={mapboxPreview || !!relocating || !!homeRelocationDraft || markerDragging} hideCount={!!homeRelocationDraft} onDragChange={setMarkerDragging}
          onSelect={(item) => {
            if (selected?.id !== item.id) setFocusRequest((request) => request + 1);
            onSelect(item);
          }} canMove={(item) => !navigationOpen && canMove(item)} onMove={onMove} />}
          {editable && draft && !navigationOpen && (relocating || editing && draftDiffers) && (
          <MapDraftMarker location={draft} label={t("Click the map or drag to set a location")}
            draggable={editable} onPick={onPick} />
        )}
        {homeRelocationDraft && <MapDraftMarker location={homeRelocationDraft} label={t("Change home location")}
          draggable={!navigationOpen} onPick={(location) => onMoveHome?.(location)} />}
      </Map>
      <MapLoadingOverlay ready={loaded} className="map-loading-overlay" />
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
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <button
          type="button"
          className="locations__add-marker-control"
          aria-label={t("Upload photos")}
          title={t("Upload photos")}
          disabled={!loaded || homeActionDisabled}
          onClick={() => {
            if (scenesRef.current) scenesRef.current.open = false;
            if (appearanceRef.current) appearanceRef.current.open = false;
            onAddPhotos();
          }}
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </AnimateIcon>
      {isMobile && <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <button
          type="button"
          className="locations__camera-control"
          aria-label={t("Capture photo")}
          title={t("Capture photo")}
          disabled={!loaded || homeActionDisabled}
          onClick={() => {
            if (scenesRef.current) scenesRef.current.open = false;
            if (appearanceRef.current) appearanceRef.current.open = false;
            onOpenCamera();
          }}
        >
          <Camera size={20} aria-hidden="true" />
        </button>
      </AnimateIcon>}
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <button
          type="button"
          className="locations__map-home-control"
          aria-label={t(homeLocation ? "Go to home" : "Set home location")}
          title={t(homeLocation ? "Go to home" : "Set home location")}
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
      <details ref={scenesRef} className="locations__scenes" aria-label={t("Map scenes")}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (event.target instanceof Element && event.target.closest("summary")) return;
          if (scenesRef.current) scenesRef.current.open = false;
          if (appearanceRef.current) appearanceRef.current.open = false;
        }}>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <summary
            className="locations__scenes-title"
            aria-label={t("Setting")}
            onClick={() => {
              if (appearanceRef.current) appearanceRef.current.open = false;
            }}
          >
            <Settings size={20} aria-hidden="true" />
            <span>{t("Setting")}</span>
            <span className="locations__scenes-chevron" aria-hidden="true">
              <ChevronDown size={16} animate={false} />
            </span>
          </summary>
        </AnimateIcon>
        <div className="locations__scene-list">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="locations__scene" aria-pressed={mapStyle === "streets"}
              onClick={() => setMapStyle("streets")}>
              <span className="locations__scene-icon" aria-hidden="true">
                <Home size={20} />
              </span>
              <span className="locations__scene-copy">
                <strong>{t("Street map")}</strong>
              </span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="locations__scene" aria-pressed={mapStyle === "3d"}
              onClick={() => {
                mapAppearance.selectLighting("day");
                mapAppearance.selectColorTheme("default");
                setMapStyle("3d");
              }}>
              <span className="locations__scene-icon" aria-hidden="true">
                <Globe size={20} animation="spin" />
              </span>
              <span className="locations__scene-copy">
                <strong>{t("3D Basemap")}</strong>
              </span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="locations__scene" aria-pressed={showMarkers}
              onClick={() => setShowMarkers((visible) => !visible)}>
              <span className="locations__scene-icon" aria-hidden="true">
                <MapPin size={20} />
              </span>
              <span className="locations__scene-copy">
                <strong>{t("Photo markers")}</strong>
              </span>
            </button>
          </AnimateIcon>
        </div>
      </details>
      <details
        ref={appearanceRef}
        className="locations__scenes map-appearance-control"
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
            className="locations__scenes-title"
            aria-label={t("Map appearance")}
            onClick={() => {
              if (scenesRef.current) scenesRef.current.open = false;
            }}
          >
            <SlidersHorizontal size={20} aria-hidden="true" />
            <span>{t("Map appearance")}</span>
            <span className="locations__scenes-chevron" aria-hidden="true">
              <ChevronDown size={16} animate={false} />
            </span>
          </summary>
        </AnimateIcon>
        <MapAppearanceSettings {...mapAppearance} isOpen={appearanceOpen} />
      </details>
    </div>
  );
}

export function MobileLocationMap(props: Props) {
  const { t } = useLocale();
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  if (!token || !token.startsWith("pk."))
    return <>
      {!token
        ? <p className="locations__map-message" role="status">{t("Set VITE_MAPBOX_ACCESS_TOKEN to enable Mapbox. Photo locations can only be set on the map.")}</p>
        : <ErrorState message="Mapbox requires a public access token starting with pk. Never use a secret token in the frontend." />}
      {props.selected?.location && (
        <NavigationFallback destination={{ ...props.selected.location, name: props.selected.originalFilename }} />
      )}
    </>;
  return <MapContent key={token} {...props} token={token} />;
}
