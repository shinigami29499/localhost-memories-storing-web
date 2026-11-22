const previewSelector = ".album-date-card__preview";
const captionSelector = ".album-date-card .album-date-card__text";
const queueTitleSelector = ".album-date-view__queue > .album-date-view__queue-title";
const duration = 360;
const easing = "cubic-bezier(.22, 1, .36, 1)";

type Snapshot = { node: HTMLElement; bounds: DOMRect };

export type AlbumCarouselMotion = {
  direction: 1 | -1;
  featured?: Snapshot;
  compact?: Snapshot;
  captions: Snapshot[];
  hasQueue: boolean;
  fadeCaptions: boolean;
};

function previewIn(stage: HTMLElement, slot: "featured" | "compact") {
  return stage.querySelector<HTMLElement>(
    `.album-date-card--${slot}:not(.album-date-card--placeholder) ${previewSelector}:not([inert] *)`,
  );
}

function capture(element: HTMLElement): Snapshot {
  const node = element.cloneNode(true) as HTMLElement;
  const style = getComputedStyle(element);
  node.style.borderRadius = style.borderRadius;
  node.style.backgroundColor = style.backgroundColor;

  // Clones leave their original card and size container during the transition.
  const children = ".album-date-card__name, .album-date-card__owner, .album-date-card__cover-placeholder, .album-date-card__cover-icon";
  const originals = element.querySelectorAll(children);
  node.querySelectorAll<HTMLElement | SVGElement>(children).forEach((child, index) => {
    const { fontSize, fontWeight, lineHeight, letterSpacing, gap, padding, inlineSize, blockSize } = getComputedStyle(originals[index]);
    Object.assign(child.style, { fontSize, fontWeight, lineHeight, letterSpacing, gap, padding });
    if (child instanceof SVGElement) Object.assign(child.style, { inlineSize, blockSize });
  });
  return { node, bounds: element.getBoundingClientRect() };
}

export function captureAlbumCarousel(stage: HTMLElement, direction: 1 | -1, { hideQueue, fadeCaptions }: {
  hideQueue: boolean;
  fadeCaptions: boolean;
}): AlbumCarouselMotion {
  const featured = previewIn(stage, "featured");
  const compact = previewIn(stage, "compact");
  return {
    direction,
    featured: featured ? capture(featured) : undefined,
    compact: compact ? capture(compact) : undefined,
    captions: fadeCaptions ? Array.from(stage.querySelectorAll<HTMLElement>(
      hideQueue ? `${captionSelector}, ${queueTitleSelector}` : captionSelector,
    ), capture) : [],
    hasQueue: Boolean(compact),
    fadeCaptions,
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
  const animate = (element: HTMLElement, frames: Keyframe[], length: number, delay = 0, timing = "ease-in-out") => {
    animations.push(element.animate(frames, { duration: length, delay, easing: timing, fill: "both" }));
  };
  const fadeOut = (element: HTMLElement) => animate(element, [{ opacity: 1 }, { opacity: 0 }], 140);
  const fadeIn = (element: HTMLElement) => animate(element, [{ opacity: 0 }, { opacity: 1 }], 240, 120);

  const snapshots = [previous.featured, previous.compact, ...previous.captions];
  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    const { node, bounds: from } = snapshot;
    Object.assign(node.style, position(from), { position: "absolute", margin: "0", aspectRatio: "auto" });
    overlay.append(node);
    if (snapshot === travel && landing) {
      node.style.zIndex = "1";
      const landingStyle = getComputedStyle(landing);
      animate(node, [{
        ...position(from),
        borderRadius: node.style.borderRadius,
        backgroundColor: node.style.backgroundColor,
      }, {
        ...position(landing.getBoundingClientRect()),
        borderRadius: landingStyle.borderRadius,
        backgroundColor: landingStyle.backgroundColor,
      }], duration, 0, easing);
      animate(landing, [{ opacity: 0 }, { opacity: 0 }], duration);

      const image = node.querySelector("img");
      if (!image || image.src !== landing.querySelector("img")?.src) {
        const addLayer = (content: HTMLElement) => {
          const layer = document.createElement("div");
          layer.className = "album-date-view__motion-cover-layer";
          layer.append(...content.childNodes);
          node.append(layer);
          return layer;
        };
        const sourceLayer = addLayer(node);
        const targetLayer = addLayer(capture(landing).node);
        animate(sourceLayer, [{ opacity: 1 }, { opacity: 0 }], 210, 70);
        animate(targetLayer, [{ opacity: 0 }, { opacity: 1 }], 210, 70);
      }
    } else {
      fadeOut(node);
    }
  }

  if (landing && !travel) fadeIn(landing);
  if (incoming) fadeIn(incoming);
  if (previous.fadeCaptions) {
    stage.querySelectorAll<HTMLElement>(previous.hasQueue ? captionSelector : `${captionSelector}, ${queueTitleSelector}`).forEach(fadeIn);
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
