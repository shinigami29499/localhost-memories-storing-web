import { useEffect, useRef } from "react";

export function useThrottledCallback<T>(callback: (value: T) => void, delay: number) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const lastCall = useRef<number | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef<T>(undefined as T);

  useEffect(() => () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  return (value: T) => {
    latest.current = value;
    const elapsed = lastCall.current === undefined ? delay : performance.now() - lastCall.current;
    if (elapsed >= delay) {
      clearTimeout(timer.current);
      timer.current = undefined;
      lastCall.current = performance.now();
      callbackRef.current(value);
    } else if (timer.current === undefined) {
      timer.current = setTimeout(() => {
        timer.current = undefined;
        lastCall.current = performance.now();
        callbackRef.current(latest.current);
      }, delay - elapsed);
    }
  };
}
