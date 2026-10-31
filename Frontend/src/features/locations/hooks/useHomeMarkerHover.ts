import { useCallback, useEffect, useRef, useState } from "react";

export function useHomeMarkerHover() {
  const [homeHovered, setHomeHovered] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHomeHoverChange = useCallback((hovered: boolean) => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    if (hovered) setHomeHovered(true);
    // Allow the pointer to cross the gap to a spiderfied marker.
    else timer.current = setTimeout(() => setHomeHovered(false), 200);
  }, []);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  return { homeHovered, onHomeHoverChange };
}
