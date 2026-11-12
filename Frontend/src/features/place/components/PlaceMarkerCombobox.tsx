import { SelectField } from "../../../components/ui/SelectField";
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
  const items = [...PLACE_MARKER_ICONS] as string[];
  if (value && !items.includes(value)) items.push(value);
  const labelForIcon = (icon: string) => {
    const knownIcon = PLACE_MARKER_ICONS.find((item) => item === icon);
    return knownIcon ? `${icon} ${t(ICON_LABELS[knownIcon])}` : icon;
  };

  return (
    <SelectField
      label={t("Marker icon")}
      value={value}
      disabled={disabled}
      options={items.map((icon) => ({ label: labelForIcon(icon), value: icon }))}
      onChange={onChange}
    />
  );
}
