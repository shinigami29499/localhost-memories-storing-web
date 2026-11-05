import { useId } from "react";
import { Select } from "@animate-ui/react/primitives/base-ui/select";
import { ChevronDownIcon } from "../../../components/animate-ui/icons/chevron-down";
import { useLocale } from "../../../context/LocaleContext";
import { PLACE_MARKER_ICONS } from "../types";

interface Props {
  value: string;
  disabled: boolean;
  onChange: (icon: string) => void;
}

const ICON_LABELS: Record<(typeof PLACE_MARKER_ICONS)[number], string> = {
  "🍜": "Noodles",
  "🍕": "Pizza",
  "🍣": "Sushi",
  "🍔": "Burger",
  "🍗": "Chicken",
  "🥗": "Salad",
  "🍱": "Bento",
  "🌮": "Taco",
  "🍲": "Soup",
  "🥐": "Croissant",
  "🍰": "Cake",
  "☕": "Coffee",
  "🍺": "Beer",
  "🧋": "Bubble tea",
};

export function PlaceMarkerCombobox({ value, disabled, onChange }: Props) {
  const { t } = useLocale();
  const inputId = useId();
  const items = [...PLACE_MARKER_ICONS] as string[];
  if (value && !items.includes(value)) items.push(value);
  const labelForIcon = (icon: string) => {
    const knownIcon = PLACE_MARKER_ICONS.find((item) => item === icon);
    return knownIcon ? `${icon} ${t(ICON_LABELS[knownIcon])}` : icon;
  };

  return (
    <div className="place__field">
      <label className="place__field-label" htmlFor={inputId}>{t("Marker icon")}</label>
      <Select.Root items={items.map((icon) => ({ label: labelForIcon(icon), value: icon }))}
        value={value} onValueChange={(icon) => icon && onChange(icon)}>
        <Select.Trigger
          id={inputId}
          className="place__marker-trigger place__marker-select-trigger"
          aria-label={t("Marker icon")}
          disabled={disabled}
        >
          <Select.Value>{labelForIcon(value)}</Select.Value>
          <ChevronDownIcon size={18} className="place__marker-select-icon" aria-hidden="true" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className="place__marker-positioner" sideOffset={4}>
            <Select.Popup className="place__marker-popup">
              <Select.List className="place__marker-list">
                {items.map((icon) => (
                  <Select.Item key={icon} value={icon} className="place__marker-item">
                    <Select.ItemText>{labelForIcon(icon)}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
