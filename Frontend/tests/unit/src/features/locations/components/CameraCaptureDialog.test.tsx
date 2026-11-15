// @vitest-environment jsdom
import { act, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { CameraCaptureDialog } from "../../../../../../src/features/locations/components/CameraCaptureDialog";
import { MobileCameraCaptureDialog } from "../../../../../../apps/mobile/src/places/MobileCameraCaptureDialog";

vi.mock("../../../../../../src/components/ui", () => {
  const Container = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  return {
    Button: (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
    CustomDialog: { Root: Container, Portal: Container, Backdrop: () => null, Viewport: Container, Popup: Container, Title: Container },
    useCustomDialog: (onClose: () => void) => ({ dialogProps: {}, dismiss: onClose, close: (done: () => void) => { done(); onClose(); } }),
  };
});
vi.mock("../../../../../../src/components/ui/Toast", () => ({ showToast: { error: vi.fn() } }));

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each([["web", CameraCaptureDialog], ["mobile", MobileCameraCaptureDialog]] as const)("%s camera captures a photo and stops its stream", async (_, Dialog) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] };
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["image"], { type: "image/jpeg" })));
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:preview");
    static revokeObjectURL = vi.fn();
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onCapture = vi.fn();
  await act(async () => { root.render(<Dialog onCapture={onCapture} onClose={vi.fn()} />); });
  const video = container.querySelector("video")!;
  Object.defineProperties(video, { videoWidth: { value: 640 }, videoHeight: { value: 480 } });
  const capture = [...container.querySelectorAll("button")].find((button) => button.textContent === "Capture")!;
  expect(capture.disabled).toBe(false);
  await act(async () => capture.click());
  expect(stop).toHaveBeenCalledOnce();
  expect(container.querySelector('img[alt="Captured photo preview"]')).not.toBeNull();
  await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Upload photo")!.click());
  expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ type: "image/jpeg" }));
  await act(async () => root.unmount());
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  container.remove();
});

it("stops a camera stream that arrives after the mobile dialog closes", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const stop = vi.fn();
  let finish!: (stream: MediaStream) => void;
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => new Promise<MediaStream>((resolve) => { finish = resolve; }) } });
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<MobileCameraCaptureDialog onCapture={vi.fn()} onClose={vi.fn()} />));
  await act(async () => root.unmount());
  await act(async () => finish({ getTracks: () => [{ stop }] } as unknown as MediaStream));
  expect(stop).toHaveBeenCalledOnce();
});
