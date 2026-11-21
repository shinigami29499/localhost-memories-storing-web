const previewSelector = ".album-date-card__preview";
const queueChromeSelector = ".album-date-view__queue-title, .album-date-card--compact .album-date-card__text, .album-date-view__advance";
const fadeOutDuration = 130;
const slideDuration = 270;
const arrival = fadeOutDuration + slideDuration;

type Snapshot = { node: HTMLElement; bounds: DOMRect };

export type AlbumCarouselMotion = {
  direction: 1 | -1;
  featured?: Snapshot;
  compact?: Snapshot;
  exitingQueue: Snapshot[];
};

function previewIn(stage: HTMLElement, slot: "featured" | "compact") {
  return stage.querySelector<HTMLElement>(`.album-date-card--${slot} ${previewSelector}`);
}

export function captureAlbumCarousel(stage: HTMLElement, direction: 1 | -1, hideQueue: boolean): AlbumCarouselMotion {
  const capture = (element: HTMLElement) => {
    const node = element.cloneNode(true) as HTMLElement;
    const style = getComputedStyle(element);
    node.style.borderRadius = style.borderRadius;
    node.style.backgroundColor = style.backgroundColor;
    return { node, bounds: element.getBoundingClientRect() };
  };
  const featured = previewIn(stage, "featured");
  const compact = previewIn(stage, "compact");
  return {
    direction,
    featured: featured ? capture(featured) : undefined,
    compact: compact ? capture(compact) : undefined,
    exitingQueue: hideQueue ? Array.from(stage.querySelectorAll<HTMLElement>(queueChromeSelector), capture) : [],
  };
}

export function animateAlbumCarousel(stage: HTMLElement, overlay: HTMLElement, previous: AlbumCarouselMotion) {
  const { direction } = previous;
  const bounds = overlay.getBoundingClientRect();
  const position = (rect: DOMRect) => ({
    left: `${rect.left - bounds.left}px`,
    top: `${rect.top - bounds.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  const first = direction === 1 ? "featured" : "compact";
  const second = direction === 1 ? "compact" : "featured";
  const landing = previewIn(stage, first);
  const incoming = previewIn(stage, second);
  const travel = previous[second];
  const animations: Animation[] = [];
  const animate = (element: HTMLElement, frames: Keyframe[], duration: number, delay = 0) => {
    animations.push(element.animate(frames, { duration, delay, easing: "ease-in-out", fill: "both" }));
  };

  const snapshots = [previous.featured, previous.compact, ...previous.exitingQueue];
  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    const { node, bounds: from } = snapshot;
    Object.assign(node.style, position(from), { position: "absolute", margin: "0", aspectRatio: "auto" });
    overlay.append(node);
    if (snapshot === travel && landing) {
      node.style.zIndex = "1";
      animate(node, [position(from), {
        ...position(landing.getBoundingClientRect()),
        borderRadius: getComputedStyle(landing).borderRadius,
      }], slideDuration, fadeOutDuration);
    } else {
      animate(node, [{ opacity: 1 }, { opacity: 0 }], fadeOutDuration);
    }
  }

  const fadeIn = (element: HTMLElement, duration = 145) =>
    animate(element, [{ opacity: 0 }, { opacity: 1 }], duration, arrival);
  if (landing) fadeIn(landing, travel ? 1 : 145);
  if (incoming) fadeIn(incoming);
  if (!previous.compact) {
    stage.querySelectorAll<HTMLElement>(queueChromeSelector).forEach((element) => fadeIn(element));
  }

  let active = true;
  const cleanup = () => {
    if (!active) return;
    active = false;
    animations.forEach((animation) => animation.cancel());
    overlay.replaceChildren();
  };
  void Promise.allSettled(animations.map((animation) => animation.finished)).then(cleanup);
  return cleanup;
}
