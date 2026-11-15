import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { Layer, Marker, Source, useMap } from "react-map-gl/mapbox";
import { Button } from "@/components/ui";
import { PageActionButton } from "@/components/layout/PageActionButton";
import { PageActionBar } from "../layout/MobilePageActionBar";
import { AnimateIcon, AnimatedAction, useAnimateIconOnChange } from "@/components/animate-ui/icons/icon";
import { XIcon } from "@/components/animate-ui/icons/x";
import { Compass } from "@/components/animate-ui/icons/compass";
import { Pencil } from "@/components/animate-ui/icons/pencil";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Check } from "@/components/animate-ui/icons/check";
import { useLocale } from "@/context/LocaleContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useNavigation } from "@/features/navigation/hooks/useNavigation";
import type { Coordinate, NavigationDestination } from "@/features/navigation/services/directionsService";
import { MobileGoogleMapsLink as GoogleMapsLink } from "./MobileNavigationOptions";

import "./mobile-map-navigation.css";
import { useNavigationSession } from "@/features/navigation/components/useNavigationSession";

interface Props {
  destination: NavigationDestination;
  accessToken: string;
  homeLocation?: Coordinate | null;
  onOpenChange: (open: boolean) => void;
  onMapboxPreviewChange?: (previewing: boolean) => void;
  onEdit?: () => void;
  editAction?: "edit" | "add" | "confirm";
  onCancel?: () => void;
}

export function NavigationToolbar({ onEdit, onNavigate, onCancel, editAction = "edit", showNavigate = true, label }: {
  onEdit?: () => void;
  onNavigate?: () => void;
  onCancel?: () => void;
  editAction?: "edit" | "add" | "confirm";
  showNavigate?: boolean;
  label?: string;
}) {
  const { t } = useLocale();
  const editLabel = editAction === "add" ? "Add" : editAction === "confirm" ? "Confirm" : "Edit";
  const actionAnimationRevision = useAnimateIconOnChange(
    `${editAction}:${Boolean(onEdit)}:${Boolean(onNavigate)}:${Boolean(onCancel)}:${showNavigate}`,
    true,
  );
  return (
    <PageActionBar className={`gallery-page__actions map-navigation__toolbar${showNavigate ? "" : " map-navigation__toolbar--two-actions"}`} role="group" aria-label={label ?? t("Navigation")}>
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <PageActionButton aria-label={t(editLabel)} title={t(editLabel)} disabled={!onEdit} onClick={onEdit}>
          <AnimatedAction animationRevision={actionAnimationRevision}>
            {editAction === "add" ? <Plus size={20} aria-hidden="true" /> : editAction === "confirm" ? <Check size={20} aria-hidden="true" /> : <Pencil size={20} aria-hidden="true" />}
          </AnimatedAction>
        </PageActionButton>
      </AnimateIcon>
      <span className="gallery-selection-bar__divider" aria-hidden="true" />
      {showNavigate && <>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <PageActionButton className="map-navigation__trigger" aria-label={t("Navigate")} title={t("Navigate")} disabled={!onNavigate} onClick={onNavigate}>
            <AnimatedAction animationRevision={actionAnimationRevision}><Compass size={22} aria-hidden="true" /></AnimatedAction> <span>{t("Navigate")}</span>
          </PageActionButton>
        </AnimateIcon>
        <span className="gallery-selection-bar__divider" aria-hidden="true" />
      </>}
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <PageActionButton className="map-navigation__dismiss" aria-label={t("Cancel")} title={t("Cancel")} disabled={!onCancel} onClick={onCancel}>
          <AnimatedAction animationRevision={actionAnimationRevision}><XIcon size={20} aria-hidden="true" /></AnimatedAction>
        </PageActionButton>
      </AnimateIcon>
    </PageActionBar>
  );
}

export function DisabledNavigationToolbar() {
  return <NavigationToolbar />;
}

export function MapNavigation({ destination, accessToken, homeLocation, onOpenChange, onMapboxPreviewChange, onEdit, editAction, onCancel }: Props) {
  const { t, language } = useLocale();
  // Changing the destination or language must cancel requests and release the GPS watch.
  return <NavigationSession
    key={`${destination.latitude}:${destination.longitude}:${language}:${accessToken}`}
    destination={destination} accessToken={accessToken} homeLocation={homeLocation}
    onOpenChange={onOpenChange} name={t("Navigation")}
    onMapboxPreviewChange={onMapboxPreviewChange}
    onEdit={onEdit} editAction={editAction} onCancel={onCancel}
  />;
}

function NavigationSession({ destination, accessToken, homeLocation, onOpenChange, onMapboxPreviewChange, onEdit, editAction, onCancel, name }: Props & { name: string }) {
  const { t, map, navigation, route, position, tracking, loading, locating, error, expanded, setExpanded, id, sourceId, geometry, busy, gpsUnreliable, close } = useNavigationSession({ destination, accessToken, homeLocation, onOpenChange, onMapboxPreviewChange, onEdit, editAction, onCancel, name });
  return (
    <>
      {geometry && (
        <Source id={sourceId} type="geojson" data={geometry}>
          <Layer id={`${sourceId}-outline`} type="line" slot="top"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": "#F4F3EE", "line-width": 9 }} />
          <Layer id={`${sourceId}-route`} type="line" slot="top"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": "#6A3F36", "line-width": 5 }} />
        </Source>
      )}
      {position && (
        <Marker latitude={position.latitude} longitude={position.longitude} anchor="center"
          onClick={(event) => event.originalEvent.stopPropagation()}>
          <span className="map-navigation__position" role="img" aria-label={t("Your current location")} />
        </Marker>
      )}
      {route && (
        <Marker latitude={destination.latitude} longitude={destination.longitude} anchor="bottom"
          onClick={(event) => event.originalEvent.stopPropagation()}>
          <span className="map-navigation__destination" role="img" aria-label={destination.name} />
        </Marker>
      )}
      <NavigationToolbar onEdit={onEdit} editAction={editAction}
        onNavigate={() => expanded ? close() : setExpanded(true)} onCancel={onCancel} />
      {expanded && <section className="map-navigation" aria-label={name} data-expanded="true"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
          <>
            <div className="map-navigation__actions">
              <GoogleMapsLink destination={destination} mode="driving"
                origin={navigation.usingHomeOrigin ? homeLocation ?? undefined : undefined}
                onOpen={navigation.stop} />
              {!tracking && (
                <Button type="button" variant="secondary" busy={busy} aria-pressed={navigation.mapboxPreview} onClick={navigation.preview}>
                  {t(locating ? "Finding your locationâ€¦" : loading ? "Loading routeâ€¦" : "Preview with Mapbox")}
                </Button>
              )}
            </div>
            {error && <p role="alert">{t(error)}</p>}
            {gpsUnreliable && <p role="status">{t("Waiting for a reliable GPS signal. Guidance is paused.")}</p>}
          </>
      </section>}
    </>
  );
}
