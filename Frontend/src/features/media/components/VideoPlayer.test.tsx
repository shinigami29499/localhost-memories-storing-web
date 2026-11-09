// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VideoPlayer } from "./VideoPlayer";

describe("VideoPlayer lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("pauses in the background and releases its source on unmount", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    const load = vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<StrictMode><VideoPlayer src="/video.mp4" name="Video" onError={vi.fn()} /></StrictMode>));
    const video = container.querySelector("video")!;
    expect(video.getAttribute("src")).toBe("/video.mp4");
    const initialPauses = pause.mock.calls.length;
    const initialLoads = load.mock.calls.length;
    hidden.mockReturnValue(true);
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(pause).toHaveBeenCalledTimes(initialPauses + 1);
    await act(async () => root.unmount());
    expect(video.hasAttribute("src")).toBe(false);
    expect(load).toHaveBeenCalledTimes(initialLoads + 1);
    const pauses = pause.mock.calls.length;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(pause).toHaveBeenCalledTimes(pauses);
  });

  it("surfaces playback failures instead of hiding them", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("Playback blocked"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const onError = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<VideoPlayer src="/video.mp4" name="Video" onError={onError} />));
      await act(async () => container.querySelector<HTMLButtonElement>(".video-player__controls button")!.click());
      expect(onError).toHaveBeenCalledTimes(1);
      expect(warning).toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
    }
  });
});
