import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchLocations } from "../services/locationSearchService";

export function useLocationSearch(query: string, enabled: boolean) {
  const text = query.trim();
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    if (!enabled || text.length < 3) {
      setDebounced("");
      return;
    }
    const timer = window.setTimeout(() => setDebounced(text), 500);
    return () => window.clearTimeout(timer);
  }, [text, enabled]);

  const ready = enabled && text.length >= 3 && text === debounced;
  const result = useQuery({
    queryKey: ["location-search", ready ? debounced : ""],
    queryFn: ({ signal }) => searchLocations(debounced, signal),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    results: ready ? result.data : undefined,
    searching: enabled && text.length >= 3 && (!ready || result.isFetching),
    error: ready ? result.error : null,
    retry: result.refetch,
  };
}
