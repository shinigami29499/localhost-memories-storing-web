import * as React from "react";
import { useInView } from "motion/react";
import { cn } from "../../../lib/utils";

function usePageVisible() {
  const [visible, setVisible] = React.useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );

  React.useEffect(() => {
    const updateVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  return visible;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduced(mediaQuery.matches);
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return reduced;
}

export type TopographyBackgroundProps = React.ComponentProps<"div">;

export function TopographyBackground({
  className,
  ...props
}: TopographyBackgroundProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const inView = useInView(containerRef);
  const pageVisible = usePageVisible();
  const reducedMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!container || !canvas || !context) return;

    const cellSize = 32;
    let width = 0;
    let height = 0;
    let columns = 0;
    let rows = 0;
    let values = new Float32Array(0);
    const crossings = new Float32Array(8);
    let pixelRatio = 1;
    let frameId = 0;
    let lastFrameTime = 0;
    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      strength: 0,
      targetStrength: 0,
    };
    const waves: Array<{ x: number; y: number; startedAt: number }> = [];

    const terrain = (x: number, y: number, time: number, timestamp: number) => {
      const base =
        Math.sin(x * 0.006 + Math.sin(y * 0.003 + time * 0.18) * 0.8 + time * 0.12) * 0.55 +
        Math.cos(y * 0.005 - Math.cos(x * 0.002 + time * 0.12) * 0.7 - time * 0.1) * 0.5 +
        Math.sin((x + y) * 0.003 + time * 0.08) * 0.3;
      const localX = x + width / 2;
      const localY = y + height / 2;
      const pointerX = localX - pointer.x;
      const pointerY = localY - pointer.y;
      const peak =
        Math.exp(-(pointerX * pointerX + pointerY * pointerY) / 20800) *
        pointer.strength *
        0.85;
      const ripple = waves.reduce((total, wave) => {
        const age = (timestamp - wave.startedAt) / 1000;
        const distance = Math.hypot(localX - wave.x, localY - wave.y);
        const radius = age * 240;
        const ring = Math.exp(-((distance - radius) ** 2) / 1800);
        return total + Math.sin((distance - radius) * 0.06) * ring * Math.exp(-age * 1.1) * 0.75;
      }, 0);

      return base + peak + ripple;
    };

    const draw = (timestamp: number) => {
      if (width === 0 || height === 0) return;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const time = reducedMotion ? 0 : timestamp * 0.0012;
      const elapsed = Math.min(Math.max(timestamp - lastFrameTime, 0), 50) / 1000;
      lastFrameTime = timestamp;
      const follow = 1 - Math.exp(-24 * elapsed);
      const rise = 1 - Math.exp(-18 * elapsed);
      pointer.x += (pointer.targetX - pointer.x) * follow;
      pointer.y += (pointer.targetY - pointer.y) * follow;
      pointer.strength += (pointer.targetStrength - pointer.strength) * rise;

      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          values[row * columns + column] = terrain(
            column * cellSize - width / 2,
            row * cellSize - height / 2,
            time,
            timestamp,
          );
        }
      }

      context.strokeStyle = getComputedStyle(container).color;
      for (let levelIndex = 0; levelIndex < 12; levelIndex++) {
        const level = -0.9 + levelIndex * 0.16;
        const path = new Path2D();

        for (let row = 0; row < rows - 1; row++) {
          for (let column = 0; column < columns - 1; column++) {
            const x = column * cellSize;
            const y = row * cellSize;
            const topLeft = values[row * columns + column]!;
            const topRight = values[row * columns + column + 1]!;
            const bottomRight = values[(row + 1) * columns + column + 1]!;
            const bottomLeft = values[(row + 1) * columns + column]!;
            let crossingCount = 0;
            if ((topLeft < level) !== (topRight < level)) {
              const ratio = (level - topLeft) / (topRight - topLeft);
              crossings[crossingCount++] = x + cellSize * ratio;
              crossings[crossingCount++] = y;
            }
            if ((topRight < level) !== (bottomRight < level)) {
              const ratio = (level - topRight) / (bottomRight - topRight);
              crossings[crossingCount++] = x + cellSize;
              crossings[crossingCount++] = y + cellSize * ratio;
            }
            if ((bottomRight < level) !== (bottomLeft < level)) {
              const ratio = (level - bottomRight) / (bottomLeft - bottomRight);
              crossings[crossingCount++] = x + cellSize * (1 - ratio);
              crossings[crossingCount++] = y + cellSize;
            }
            if ((bottomLeft < level) !== (topLeft < level)) {
              const ratio = (level - bottomLeft) / (topLeft - bottomLeft);
              crossings[crossingCount++] = x;
              crossings[crossingCount++] = y + cellSize * (1 - ratio);
            }

            for (let i = 0; i + 3 < crossingCount; i += 4) {
              path.moveTo(crossings[i]!, crossings[i + 1]!);
              path.lineTo(crossings[i + 2]!, crossings[i + 3]!);
            }
          }
        }

        context.globalAlpha = levelIndex % 4 === 0 ? 0.2 : 0.1;
        context.lineWidth = levelIndex % 4 === 0 ? 1.2 : 0.8;
        context.stroke(path);
      }

      context.globalAlpha = 1;
      for (let i = waves.length - 1; i >= 0; i--) {
        if (timestamp - waves[i]!.startedAt > 2800) waves.splice(i, 1);
      }
    };

    const updatePointer = (event: PointerEvent) => {
      if (reducedMotion) return;
      const bounds = container.getBoundingClientRect();
      pointer.targetX = event.clientX - bounds.left;
      pointer.targetY = event.clientY - bounds.top;
      pointer.targetStrength = 1;
    };

    const addWave = (event: PointerEvent) => {
      if (reducedMotion) return;
      updatePointer(event);
      pointer.x = pointer.targetX;
      pointer.y = pointer.targetY;
      waves.push({
        x: pointer.targetX,
        y: pointer.targetY,
        startedAt: performance.now(),
      });
      if (waves.length > 8) waves.shift();
    };

    const clearPointer = () => {
      pointer.targetStrength = 0;
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) clearPointer();
    };

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      columns = Math.ceil(width / cellSize) + 1;
      rows = Math.ceil(height / cellSize) + 1;
      values = new Float32Array(columns * rows);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));
      draw(performance.now());
    };

    const animate = (timestamp: number) => {
      draw(timestamp);
      frameId = requestAnimationFrame(animate);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("pointerdown", addWave, { passive: true });
    window.addEventListener("blur", clearPointer);
    window.addEventListener("pointerout", handlePointerOut);
    const themeObserver = new MutationObserver(() => draw(performance.now()));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    if (inView && pageVisible && !reducedMotion) {
      frameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("pointerdown", addWave);
      window.removeEventListener("blur", clearPointer);
      window.removeEventListener("pointerout", handlePointerOut);
    };
  }, [inView, pageVisible, reducedMotion]);

  return (
    <div
      ref={containerRef}
      data-slot="topography-background"
      className={cn("relative size-full overflow-hidden text-[var(--text)]", className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 block size-full"
      />
    </div>
  );
}
