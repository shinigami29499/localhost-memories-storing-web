// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../../../src/context/LocaleContext";
import { mediaService } from "../../../../../src/features/media/services/mediaService";
import { showToast } from "../../../../../src/components/ui/Toast";
import { useTrashPage } from "../../../../../src/pages/gallery/useTrashPage";

vi.mock("../../../../../src/features/media/services/mediaService", () => ({ mediaService: {
  deleted: vi.fn(async () => ({ offset: 0, total: 0, items: [] })),
  restore: vi.fn(), remove: vi.fn(), permanentlyDelete: vi.fn(),
} }));
vi.mock("../../../../../src/components/ui/Toast", () => ({ showToast: { success: vi.fn() } }));

it.each(["retry", "cancel"] as const)("keeps Undo for successful restores after %s", async (decision) => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let controller!: ReturnType<typeof useTrashPage>;
  function Harness() { controller = useTrashPage(); return null; }
  vi.mocked(mediaService.restore).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce(undefined);
  vi.mocked(mediaService.remove).mockResolvedValue(undefined);
  await act(async () => root.render(<QueryClientProvider client={client}><LocaleProvider><Harness /></LocaleProvider></QueryClientProvider>));
  await act(async () => controller.requestAction("restore", ["one", "two"]));
  await act(async () => { await expect(controller.confirmAction()).rejects.toThrow("network"); });
  expect(controller.action?.ids).toEqual(["two"]);
  if (decision === "retry") {
    await act(async () => { await controller.confirmAction(); });
  } else {
    await act(async () => controller.cancelAction());
  }
  expect(vi.mocked(mediaService.restore).mock.calls.map(([id]) => id)).toEqual(
    decision === "retry" ? ["one", "two", "two"] : ["one", "two"],
  );
  expect(showToast.success).toHaveBeenCalledTimes(1);
  const options = vi.mocked(showToast.success).mock.calls.at(-1)?.[1];
  await act(async () => { if (typeof options === "object") await options?.undo?.(); });
  expect(vi.mocked(mediaService.remove).mock.calls.map(([id]) => id)).toEqual(
    decision === "retry" ? ["one", "two"] : ["one"],
  );
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
});


it("offers Undo on unmount after a partial restore failure", async () => {
  vi.clearAllMocks();
  vi.mocked(mediaService.restore).mockReset().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("network"));
  vi.mocked(mediaService.remove).mockResolvedValue(undefined);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let controller!: ReturnType<typeof useTrashPage>;
  function Harness() { controller = useTrashPage(); return null; }
  await act(async () => root.render(<QueryClientProvider client={client}><LocaleProvider><Harness /></LocaleProvider></QueryClientProvider>));
  await act(async () => controller.requestAction("restore", ["one", "two"]));
  await act(async () => { await expect(controller.confirmAction()).rejects.toThrow("network"); });
  expect(showToast.success).not.toHaveBeenCalled();
  await act(async () => root.unmount());
  expect(showToast.success).toHaveBeenCalledTimes(1);
  const options = vi.mocked(showToast.success).mock.calls[0]?.[1];
  await act(async () => { if (typeof options === "object") await options?.undo?.(); });
  expect(mediaService.remove).toHaveBeenCalledExactlyOnceWith("one");
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
});

it.each(["failure", "success"] as const)("offers one Undo when restore finishes with %s after unmount", async (outcome) => {
  vi.clearAllMocks();
  vi.mocked(mediaService.restore).mockReset();
  vi.mocked(mediaService.remove).mockResolvedValue(undefined);
  let resolveSecond!: () => void;
  let rejectSecond!: (error: Error) => void;
  const second = new Promise<void>((resolve, reject) => { resolveSecond = resolve; rejectSecond = reject; });
  vi.mocked(mediaService.restore).mockResolvedValueOnce(undefined).mockReturnValueOnce(second);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let controller!: ReturnType<typeof useTrashPage>;
  function Harness() { controller = useTrashPage(); return null; }
  await act(async () => root.render(<QueryClientProvider client={client}><LocaleProvider><Harness /></LocaleProvider></QueryClientProvider>));
  await act(async () => controller.requestAction("restore", ["one", "two"]));
  let pending!: Promise<void>;
  await act(async () => { pending = controller.confirmAction(); void pending.catch(() => {}); await Promise.resolve(); });
  expect(mediaService.restore).toHaveBeenCalledTimes(2);
  await act(async () => root.unmount());
  expect(showToast.success).not.toHaveBeenCalled();
  await act(async () => {
    if (outcome === "failure") { rejectSecond(new Error("network")); await expect(pending).rejects.toThrow("network"); }
    else { resolveSecond(); await pending; }
  });
  expect(showToast.success).toHaveBeenCalledTimes(1);
  const options = vi.mocked(showToast.success).mock.calls[0]?.[1];
  await act(async () => { if (typeof options === "object") await options?.undo?.(); });
  expect(vi.mocked(mediaService.remove).mock.calls.map(([id]) => id)).toEqual(outcome === "failure" ? ["one"] : ["one", "two"]);
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
});
