import { useEffect, useState } from "react";
import { UI_TIMING } from "../config/uiTiming";

export function useDebouncedValue<T>(value: T, delay: number = UI_TIMING.SEARCH_DEBOUNCE): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
