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


export function useLocationSearchController({ disabled = false, onFocus, onSelect }: Props) {
  const { t } = useLocale();
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, searching, error, retry } = useLocationSearch(query, open && !disabled);
  const showResults = open && !disabled;
  const showMessage = showResults && (query.trim().length < 3 || searching || !!error || results?.length === 0);
  return { t, id, query, setQuery, setOpen, results, searching, error, retry, showResults, showMessage };
}
