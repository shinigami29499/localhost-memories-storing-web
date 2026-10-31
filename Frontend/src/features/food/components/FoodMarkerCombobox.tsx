import { useId } from "react";
import { Select } from "@animate-ui/react/primitives/base-ui/select";
import { ChevronDownIcon } from "../../../components/animate-ui/icons/chevron-down";
import { useLocale } from "../../../context/LocaleContext";
import { FOOD_MARKER_ICONS } from "../types";

interface Props {
  value: string;
  disabled: boolean;
  onChange: (icon: string) => void;
}

const ICON_LABELS: Record<(typeof FOOD_MARKER_ICONS)[number], string> = {
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

export function FoodMarkerCombobox({ value, disabled, onChange }: Props) {
  const { t } = useLocale();
  const inputId = useId();
  const items = [...FOOD_MARKER_ICONS] as string[];
  if (value && !items.includes(value)) items.push(value);
  const labelForIcon = (icon: string) => {
    const knownIcon = FOOD_MARKER_ICONS.find((item) => item === icon);
    return knownIcon ? `${icon} ${t(ICON_LABELS[knownIcon])}` : icon;
  };

  return (
    <div className="food__field">
      <label className="food__field-label" htmlFor={inputId}>{t("Marker icon")}</label>
      <Select.Root items={items} value={value} onValueChange={(icon) => icon && onChange(icon)}>
        <Select.Trigger
          id={inputId}
          className="food__marker-trigger food__marker-select-trigger"
          aria-label={t("Marker icon")}
          disabled={disabled}
        >
          <Select.Value>{labelForIcon(value)}</Select.Value>
          <ChevronDownIcon size={18} className="food__marker-select-icon" aria-hidden="true" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className="food__marker-positioner" sideOffset={4}>
            <Select.Popup className="food__marker-popup">
              <Select.List className="food__marker-list">
                {items.map((icon) => (
                  <Select.Item key={icon} value={icon} className="food__marker-item">
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
