import { useId, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useLocale } from "../../../context/LocaleContext";
import { googleDirectionsUrl, type Coordinate, type NavigationDestination, type TravelMode } from "../services/directionsService";
import "./mapNavigation.css";

const modes: { value: TravelMode; label: string }[] = [
  { value: "driving", label: "Driving" },
  { value: "walking", label: "Walking" },
  { value: "cycling", label: "Cycling" },
];

export function NavigationModeSelect({ mode, disabled, onChange }: {
  mode: TravelMode;
  disabled?: boolean;
  onChange: (mode: TravelMode) => void;
}) {
  const { t } = useLocale();
  const id = useId();
  return (
    <>
      <span id={id}>{t("Travel mode")}</span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="map-navigation__mode-trigger" disabled={disabled} aria-labelledby={id}>
          <span>{t(modes.find((item) => item.value === mode)?.label ?? "Driving")}</span>
          <span className="map-navigation__mode-chevron" aria-hidden="true" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="map-navigation__mode-menu" align="start" sideOffset={4} collisionPadding={8}>
            <DropdownMenu.RadioGroup value={mode} onValueChange={(value) => {
              const selected = modes.find((item) => item.value === value);
              if (selected) onChange(selected.value);
            }}>
              {modes.map((item) => (
                <DropdownMenu.RadioItem className="map-navigation__mode-item" key={item.value} value={item.value}>
                  {t(item.label)}
                  <DropdownMenu.ItemIndicator aria-hidden="true">✓</DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}

export function GoogleMapsLink({ destination, mode, origin, onOpen }: {
  destination: NavigationDestination;
  mode: TravelMode;
  origin?: Coordinate;
  onOpen?: () => void;
}) {
  const { t } = useLocale();
  return (
    <a className="btn btn--secondary" href={googleDirectionsUrl(destination, mode, origin)}
      target="_blank" rel="noopener noreferrer" onClick={onOpen}>
      {t("Open Google Maps")}
    </a>
  );
}

export function NavigationFallback({ destination }: { destination: NavigationDestination }) {
  const { t } = useLocale();
  const [mode, setMode] = useState<TravelMode>("driving");
  return (
    <section className="map-navigation map-navigation--fallback" aria-label={t("Navigation")}
      onClick={(event) => event.stopPropagation()}>
      <strong>{t("Directions to {name}", { name: destination.name })}</strong>
      <p className="map-navigation__hint">
        {t("Mapbox navigation is unavailable. You can still open Google Maps.")}
      </p>
      <p className="map-navigation__hint">
        {t("Routes start at your current location. The selected provider receives your location and destination.")}
      </p>
      <NavigationModeSelect mode={mode} onChange={setMode} />
      <GoogleMapsLink destination={destination} mode={mode} />
    </section>
  );
}
