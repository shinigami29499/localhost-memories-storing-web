import { XIcon } from "@/components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";

export function AlbumSearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useLocale();
  return (
    <div className="album-dialog__search">
      <input type="search" value={value} maxLength={120} onChange={(event) => onChange(event.target.value)}
        aria-label={t("Search albums")} placeholder={t("Search albums")} />
      {value && <button type="button" className="album-dialog__search-clear" aria-label={t("Clear search")}
        title={t("Clear search")} onMouseDown={(event) => event.preventDefault()} onClick={() => onChange("")}>
        <XIcon size={16} aria-hidden="true" />
      </button>}
    </div>
  );
}
