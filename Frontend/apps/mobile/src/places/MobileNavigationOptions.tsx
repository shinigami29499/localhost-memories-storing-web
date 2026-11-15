import { useLocale } from "@/context/LocaleContext";
import { googleDirectionsUrl, type Coordinate, type NavigationDestination, type TravelMode } from "@/features/navigation/services/directionsService";
import "./mobile-map-navigation.css";

export function MobileGoogleMapsLink({ destination, mode, origin, onOpen }: {
  destination: NavigationDestination;
  mode: TravelMode;
  origin?: Coordinate;
  onOpen?: () => void;
}) {
  const { t } = useLocale();
  return <a className="btn btn--secondary" href={googleDirectionsUrl(destination, mode, origin)}
    target="_blank" rel="noopener noreferrer" onClick={onOpen}>{t("Open Google Maps")}</a>;
}

export function MobileNavigationFallback({ destination }: { destination: NavigationDestination }) {
  const { t } = useLocale();
  return <section className="map-navigation map-navigation--fallback" aria-label={t("Navigation")}
    onClick={(event) => event.stopPropagation()}>
    <p className="map-navigation__hint">{t("Mapbox navigation is unavailable. You can still open Google Maps.")}</p>
    <MobileGoogleMapsLink destination={destination} mode="driving" />
  </section>;
}
