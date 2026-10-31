import { useId, useState } from "react";
import { Input } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { Search } from "../../../components/animate-ui/icons/search";
import { useLocale } from "../../../context/LocaleContext";
import { useLocationSearch } from "../hooks/useLocationSearch";
import type { LocationSearchResult } from "../services/locationSearchService";

interface Props {
  disabled?: boolean;
  onFocus?: () => void;
  onSelect: (result: LocationSearchResult) => void;
}

export function LocationSearch({ disabled = false, onFocus, onSelect }: Props) {
  const { t } = useLocale();
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, searching, error, retry } = useLocationSearch(query, open && !disabled);
  const showResults = open && !disabled;

  return (
    <AnimateIcon animateOnHover animateOnTap={false} animateOnView={false} completeOnStop asChild>
      <section className="food__location-search" aria-label={t("Search locations")}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setOpen(false);
          }
        }}>
        <form className="food__location-search-form" onSubmit={(event) => {
          event.preventDefault();
          if (!disabled) setOpen(true);
        }}>
          <Input
            className="food__location-search-input"
            name="query"
            value={query}
            onChange={(value) => { setQuery(value); setOpen(true); }}
            onFocus={() => { setOpen(true); onFocus?.(); }}
            placeholder={t("Search a city or address")}
            aria-label={t("Search a city or address")}
            aria-describedby={showResults ? `${id}-hint` : undefined}
            autoComplete="off"
            disabled={disabled}
            maxLength={200}
          />
          <span className="food__location-search-icon" aria-hidden="true">
            {searching ? <span className="food__location-search-spinner" /> : <Search size={20} />}
          </span>
        </form>
        {showResults && <>
          <div className="food__location-search-message">
            <p id={`${id}-hint`}>{t("Search powered by")}{" "}
              <a href="https://photon.komoot.io/" target="_blank" rel="noopener noreferrer">Photon</a>{" / "}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>.
            </p>
            {query.trim().length < 3 && <p role="status">{t("Enter at least 3 characters to search.")}</p>}
            {searching && <p role="status">{t("Searching locations…")}</p>}
            {error && <>
              <p role="alert">{t(error.message === "Location search returned an invalid response. Try again later."
                ? error.message : "Could not search locations. Check your connection and try again.")}</p>
              <button type="button" onClick={() => void retry()}>{t("Try again")}</button>
            </>}
            {!searching && results?.length === 0 && <p role="status">{t("No matching locations found.")}</p>}
          </div>
          {!searching && !!results?.length && <ul className="food__location-search-results" aria-label={t("Search results")}>
            {results.map((result) => <li key={result.id}>
              <button type="button" onClick={() => {
                setOpen(false);
                setQuery(result.placeName);
                onSelect(result);
              }}>{result.placeName}</button>
            </li>)}
          </ul>}
        </>}
      </section>
    </AnimateIcon>
  );
}
