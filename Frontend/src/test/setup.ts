/**
 * jsdom is missing the browser APIs used by useMediaQuery, the Animate UI motion
 * primitives, lazy media loading, and caption measurement. Defaults are inert; tests
 * still stub these globals when they need to drive behavior.
 */
if (typeof window !== "undefined") {
  class InertObserver {
    root = null;
    rootMargin = "";
    thresholds: readonly number[] = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  if (typeof window.matchMedia !== "function") {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  if (typeof window.IntersectionObserver !== "function") {
    window.IntersectionObserver = InertObserver as unknown as typeof IntersectionObserver;
  }

  if (typeof window.ResizeObserver !== "function") {
    window.ResizeObserver = InertObserver as unknown as typeof ResizeObserver;
  }

  if (typeof window.scrollTo !== "function") {
    window.scrollTo = (() => undefined) as typeof window.scrollTo;
  }

  if (typeof Element.prototype.getAnimations !== "function") {
    Element.prototype.getAnimations = (() => []) as typeof Element.prototype.getAnimations;
  }

  const nativeAnimate = Element.prototype.animate;
  const probe = typeof nativeAnimate === "function"
    ? (nativeAnimate.call(document.createElement("div"), []) as Animation | undefined)
    : undefined;

  if (typeof probe?.finish !== "function") {
    Element.prototype.animate = function animateStub(this: Element) {
      const animation: Record<string, unknown> = {
        currentTime: 0,
        startTime: 0,
        playState: "finished",
        playbackRate: 1,
        pending: false,
        effect: null,
        timeline: null,
        id: "",
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        onfinish: null,
        oncancel: null,
        onremove: null,
        cancel: () => undefined,
        play: () => undefined,
        pause: () => undefined,
        reverse: () => undefined,
        persist: () => undefined,
        commitStyles: () => undefined,
        updatePlaybackRate: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
        finish() {
          const handler = animation.onfinish as ((event: unknown) => void) | null;
          handler?.({});
        },
      };
      return animation as unknown as Animation;
    } as typeof Element.prototype.animate;
  }
}
