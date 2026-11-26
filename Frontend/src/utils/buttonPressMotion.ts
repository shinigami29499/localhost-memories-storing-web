const duration = 180;

export function installButtonPressMotion() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointers = new Map<number, HTMLElement>();
  const keys = new Map<string, HTMLElement>();
  const animations = new Map<HTMLElement, Animation>();

  const enabled = () => document.documentElement.dataset.motion === "on" && !reducedMotion.matches;
  const targetButton = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    const button = target.closest<HTMLElement>("button, [role='button']");
    if (!button || button.matches(":disabled, [aria-disabled='true'], [data-press-motion='off']")) return null;
    return button.querySelector<HTMLElement>("[data-press-motion-target]") ?? button;
  };
  const press = (button: HTMLElement) => {
    if (!enabled()) return;
    const existing = animations.get(button);
    if (existing && existing.playState !== "idle") {
      if (existing.playbackRate < 0) existing.reverse();
      return;
    }
    const animation = button.animate(
      [{ scale: "1" }, { scale: button.hasAttribute("data-press-motion-target") ? "1.03" : ".97" }],
      { duration, easing: "ease-out", fill: "both", composite: "add" },
    );
    animations.set(button, animation);
  };
  const release = (button: HTMLElement) => {
    if ([...pointers.values(), ...keys.values()].includes(button)) return;
    const animation = animations.get(button);
    if (!animation) return;
    animation.reverse();
    void animation.finished.then(() => {
      if (animation.playbackRate < 0 && animations.get(button) === animation) {
        animations.delete(button);
        animation.cancel();
      }
    }, (error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Button press animation failed:", error);
      }
    });
  };
  const stop = () => {
    pointers.clear();
    keys.clear();
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  };

  document.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const button = targetButton(event.target);
    if (!button) return;
    pointers.set(event.pointerId, button);
    press(button);
  }, true);
  const endPointer = (event: PointerEvent) => {
    const button = pointers.get(event.pointerId);
    if (!button) return;
    pointers.delete(event.pointerId);
    release(button);
  };
  document.addEventListener("pointerup", endPointer, true);
  document.addEventListener("pointercancel", endPointer, true);
  document.addEventListener("keydown", (event) => {
    if ((event.key !== " " && event.key !== "Enter") || event.repeat || keys.has(event.key)) return;
    const button = targetButton(event.target);
    if (!button) return;
    keys.set(event.key, button);
    press(button);
  }, true);
  document.addEventListener("keyup", (event) => {
    const button = keys.get(event.key);
    if (!button) return;
    keys.delete(event.key);
    release(button);
  }, true);
  window.addEventListener("blur", stop);
  reducedMotion.addEventListener("change", () => { if (!enabled()) stop(); });
  new MutationObserver(() => { if (!enabled()) stop(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
}
