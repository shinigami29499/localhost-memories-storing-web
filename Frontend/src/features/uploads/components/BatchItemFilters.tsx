import { Select } from "@animate-ui/react/primitives/base-ui/select";
import { Check } from "../../../components/animate-ui/icons/check";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import { useLocale } from "../../../context/LocaleContext";

interface Props {
  statuses: string[];
  types: string[];
  status: string;
  type: string;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}

export function BatchItemFilters({ statuses, types, status, type, onStatusChange, onTypeChange }: Props) {
  const { t } = useLocale();
  const filters = [
    { label: "Filter by status", all: "All statuses", options: statuses, value: status, change: onStatusChange },
    { label: "Filter by file type", all: "All file types", options: types, value: type, change: onTypeChange },
  ];
  return (
    <div className="upload-batch__filters">
      {filters.map((filter) => (
        <Select.Root key={filter.label} value={filter.value || "__all"} onValueChange={(value) => filter.change(value === "__all" ? "" : value ?? "")}>
          <Select.Trigger className="upload-batch__filter-trigger" aria-label={t(filter.label)}>
            <Select.Value>{t(filter.value ? (filter.value === "Sent to browser" ? "Success" : filter.value) : filter.all)}</Select.Value>
            <Select.Icon asChild><ChevronDown size={16} aria-hidden="true" /></Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner className="upload-batch__filter-positioner" alignItemWithTrigger={false} sideOffset={4}>
              <Select.Popup className="upload-batch__filter-popup">
                <Select.List>
                  {[{ value: "__all", label: filter.all }, ...filter.options.map((value) => ({ value, label: value === "Sent to browser" ? "Success" : value }))].map((option) => (
                    <Select.Item key={option.value} value={option.value} className="upload-batch__filter-option">
                      <Select.ItemText>{t(option.label)}</Select.ItemText>
                      <Select.ItemIndicator className="upload-batch__filter-indicator"><Check size={16} aria-hidden="true" /></Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ))}
    </div>
  );
}

export function batchFileType(filename: string, contentType?: string): string {
  if (contentType?.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|heic|bmp)$/i.test(filename)) return "Images";
  if (contentType?.startsWith("video/") || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(filename)) return "Videos";
  return "Other files";
}
