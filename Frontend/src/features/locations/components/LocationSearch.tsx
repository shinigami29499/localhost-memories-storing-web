import { useEffect, useRef, useState } from "react";
import { Input, Spinner } from "../../../components/ui";
import { Search } from "../../../components/animate-ui/icons/search";
import { useLocale } from "../../../context/LocaleContext";
import { searchLocations, type LocationSearchResult } from "../services/locationSearchService";

interface Props {
  accessToken: string;
  disabled?: boolean;
  onSelect: (result: LocationSearchResult) => void;
}

export function LocationSearch({ accessToken, disabled = false, onSelect }: Props) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const skipSearch = useRef<string | null>(null);

  useEffect(() => {
    const value = query.trim();
    setResults([]);
    setError(null);
    setSearched(false);

    if (skipSearch.current === query) {
      skipSearch.current = null;
      setLoading(false);
      return;
    }
    if (disabled || value.length < 2) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timeout = window.setTimeout(() => {
      setSearched(true);
      void searchLocations(value, accessToken, controller.signal)
        .then(setResults)
        .catch(() => {
          if (!controller.signal.aborted)
            setError(t("Could not search locations. Check your connection and try again."));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, accessToken, disabled, t]);

  const choose = (result: LocationSearchResult) => {
    setResults([]);
    skipSearch.current = query === result.placeName ? null : result.placeName;
    setQuery(result.placeName);
    setSearched(false);
    onSelect(result);
  };

  return (
    <section className="food__location-search" aria-label={t("Search locations")}>
      <div className="food__location-search-form">
        <Input
          className="food__location-search-input"
          value={query}
          onChange={setQuery}
          placeholder={t("Search a city or address")}
          aria-label={t("Search a city or address")}
          autoComplete="off"
          disabled={disabled}
        />
        <span className="food__location-search-icon" aria-hidden="true">
          {loading ? <span className="food__location-search-spinner" /> : <Search size={18} />}
        </span>
      </div>
      {loading && (
        <p className="food__location-search-message" role="status">{t("Searching locations…")}</p>
      )}
      {(error || (searched && !loading && results.length === 0)) && (
        <p className="food__location-search-message" role={error ? "alert" : "status"}>
          {error ?? t("No matching locations found.")}
        </p>
      )}
      {results.length > 0 && (
        <ul className="food__location-search-results" aria-label={t("Search results")}>
          {results.map((result) => (
            <li key={result.id}>
              <button type="button" onClick={() => choose(result)}>{result.placeName}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
