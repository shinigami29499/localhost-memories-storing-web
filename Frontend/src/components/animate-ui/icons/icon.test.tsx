// @vitest-environment jsdom
import { act, useEffect, type ReactNode, type Ref } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimateIcon, IconWrapper, useAnimateIconContext, type IconProps } from "./icon";

const animationStarts: string[] = [];

class ViewObserver implements IntersectionObserver {
  static instances = new Set<ViewObserver>();
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
  readonly targets = new Set<Element>();

  constructor(private callback: IntersectionObserverCallback) {
    ViewObserver.instances.add(this);
  }

  observe(target: Element) { this.targets.add(target); }
  unobserve(target: Element) { this.targets.delete(target); }
  disconnect() { this.targets.clear(); }
  takeRecords() { return []; }

  notify(target: Element, visible: boolean) {
    if (!this.targets.has(target)) return;
    const bounds = target.getBoundingClientRect();
    this.callback([{
      target,
      isIntersecting: visible,
      intersectionRatio: visible ? 1 : 0,
      boundingClientRect: bounds,
      intersectionRect: bounds,
      rootBounds: null,
      time: performance.now(),
    }], this);
  }
}

function ProbeIcon({ ref }: IconProps<string> & { ref?: Ref<SVGSVGElement> }) {
  const { active, controls } = useAnimateIconContext();
  useEffect(() => {
    if (!controls) return;
    const spy = vi.spyOn(controls, "start").mockImplementation(async (animation) => {
      if (typeof animation === "string") animationStarts.push(animation);
    });
    return () => spy.mockRestore();
  }, [controls]);
  return <svg ref={ref} data-active={String(active === true)} />;
}

describe("shared icon triggers", () => {
  let container: HTMLDivElement;
  let root: Root;
  let standalone: boolean;
  let fineHover: boolean;

  beforeEach(() => {
    standalone = false;
    fineHover = true;
    animationStarts.length = 0;
    ViewObserver.instances.clear();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("IntersectionObserver", ViewObserver);
    vi.stubGlobal("matchMedia", vi.fn((media: string) => ({
      matches: media === "(display-mode: standalone)" ? standalone
        : media === "(hover: hover) and (pointer: fine)" && fineHover,
      media,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    Reflect.deleteProperty(navigator, "standalone");
    vi.unstubAllGlobals();
  });

  async function render(children: ReactNode, reducedMotion: "never" | "always" = "never") {
    await act(async () => root.render(
      <AnimateUIProvider reducedMotion={reducedMotion}>{children}</AnimateUIProvider>,
    ));
  }

  async function view(target: Element, visible: boolean) {
    expect(Array.from(ViewObserver.instances).some((observer) => observer.targets.has(target))).toBe(true);
    await act(async () => {
      for (const observer of ViewObserver.instances) observer.notify(target, visible);
    });
  }

  async function pointer(target: Element, type: string) {
    await act(async () => {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget: document.body }));
    });
  }

  it("uses browser hover and press without animating on view", async () => {
    await render(<AnimateIcon asChild><button><ProbeIcon />Label</button></AnimateIcon>);
    const button = container.querySelector("button")!;
    await view(button, true);
    expect(animationStarts).not.toContain("animate");
    await pointer(button, "pointerover");
    expect(container.querySelector("svg")?.dataset.active).toBe("true");
    await pointer(button, "pointerout");
    await pointer(button, "pointerdown");
    expect(container.querySelector("svg")?.dataset.active).toBe("true");
    await pointer(button, "pointerup");
    expect(container.querySelector("svg")?.dataset.active).toBe("false");
  });

  it.each(["standalone", "ios"])("animates %s app icons on view and re-entry, not hover", async (mode) => {
    standalone = mode === "standalone";
    if (mode === "ios") Object.defineProperty(navigator, "standalone", { configurable: true, value: true });
    await render(<AnimateIcon asChild><button><ProbeIcon />Label</button></AnimateIcon>);
    const button = container.querySelector("button")!;
    expect(container.querySelector("svg")?.dataset.active).toBe("false");
    await pointer(button, "pointerover");
    expect(container.querySelector("svg")?.dataset.active).toBe("false");
    await view(button, true);
    expect(animationStarts.filter((value) => value === "animate")).toHaveLength(1);
    await view(button, false);
    await view(button, true);
    expect(animationStarts.filter((value) => value === "animate")).toHaveLength(2);
  });

  it("replays press after the entry animation finishes", async () => {
    standalone = true;
    await render(<AnimateIcon asChild><button><ProbeIcon />Label</button></AnimateIcon>);
    const button = container.querySelector("button")!;
    await view(button, true);
    expect(animationStarts.filter((value) => value === "animate")).toHaveLength(1);
    await act(async () => { await new Promise(requestAnimationFrame); });
    await pointer(button, "pointerdown");
    expect(container.querySelector("svg")?.dataset.active).toBe("true");
    await pointer(button, "pointerup");
    expect(animationStarts.filter((value) => value === "animate")).toHaveLength(2);
    await pointer(button, "pointerdown");
    await pointer(button, "pointerup");
    expect(animationStarts.filter((value) => value === "animate")).toHaveLength(3);
    await view(button, false);
    await view(button, true);
    expect(animationStarts.filter((value) => value === "animate")).toHaveLength(4);
  });

  it("animates bare icons on view and preserves explicit opt-outs", async () => {
    standalone = true;
    await render(<><IconWrapper icon={ProbeIcon} /><IconWrapper icon={ProbeIcon} animate={false} /></>);
    const [icon, spinner] = Array.from(container.querySelectorAll("svg"));
    await view(icon, true);
    await view(spinner, true);
    expect(animationStarts.filter((value) => value === "animate")).toHaveLength(1);
    expect(spinner.dataset.active).toBe("false");
  });

  it("keeps reduced-motion icons still on view and press", async () => {
    standalone = true;
    await render(<AnimateIcon asChild><button><ProbeIcon /></button></AnimateIcon>, "always");
    const button = container.querySelector("button")!;
    await view(button, true);
    await pointer(button, "pointerdown");
    expect(animationStarts).not.toContain("animate");
  });

  it("inherits parent triggers without creating duplicate icon controllers", async () => {
    standalone = true;
    await render(
      <AnimateIcon asChild><button><IconWrapper icon={ProbeIcon} /><span>Label</span></button></AnimateIcon>,
    );
    const button = container.querySelector("button")!;
    await view(button, true);
    expect(animationStarts.filter((value) => value === "animate")).toHaveLength(1);
  });

  it("supports once-only entry animations", async () => {
    standalone = true;
    await render(<AnimateIcon asChild animateOnViewOnce><button><ProbeIcon /></button></AnimateIcon>);
    const button = container.querySelector("button")!;
    await view(button, true);
    await view(button, false);
    await view(button, true);
    expect(animationStarts.filter((value) => value === "animate")).toHaveLength(1);
  });

  it("does not enable hover on touch-only browsers", async () => {
    fineHover = false;
    await render(<AnimateIcon asChild><button><ProbeIcon /></button></AnimateIcon>);
    await pointer(container.querySelector("button")!, "pointerover");
    expect(animationStarts).not.toContain("animate");
  });
});
