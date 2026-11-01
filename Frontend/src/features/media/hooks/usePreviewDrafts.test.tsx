// @vitest-environment jsdom
import { useEffect } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePreviewDrafts } from "./usePreviewDrafts";
import { previewService } from "../services/previewService";

vi.mock("../services/previewService", () => ({
  previewService: { releaseDraft: vi.fn() },
}));

function EditorDraft({ mediaId, retainOnlySelected = false }: { mediaId: string; retainOnlySelected?: boolean }) {
  const { register, retain } = usePreviewDrafts();
  useEffect(() => {
    register(mediaId);
    if (retainOnlySelected) retain([mediaId]);
  }, [mediaId, register, retain, retainOnlySelected]);
  return null;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("usePreviewDrafts", () => {
  it("retains editor drafts while editing and releases them only when the editor closes", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.mocked(previewService.releaseDraft).mockResolvedValue();
    const container = document.createElement("div");
    const root = createRoot(container);
    const client = new QueryClient();
    const render = (id: string) => root.render(
      <QueryClientProvider client={client}><EditorDraft mediaId={id} /></QueryClientProvider>,
    );
    await act(async () => render("first-draft"));
    await act(async () => render("second-draft"));
    expect(previewService.releaseDraft).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    expect(previewService.releaseDraft).toHaveBeenCalledTimes(2);
    expect(previewService.releaseDraft).toHaveBeenCalledWith("first-draft");
    expect(previewService.releaseDraft).toHaveBeenCalledWith("second-draft");
    client.clear();
  });

  it("releases a replaced draft immediately but keeps the selected draft until editor close", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.mocked(previewService.releaseDraft).mockResolvedValue();
    const root = createRoot(document.createElement("div"));
    const client = new QueryClient();
    const render = (id: string) => root.render(
      <QueryClientProvider client={client}><EditorDraft mediaId={id} retainOnlySelected /></QueryClientProvider>,
    );
    await act(async () => render("old-draft"));
    await act(async () => render("selected-draft"));
    expect(previewService.releaseDraft).toHaveBeenCalledExactlyOnceWith("old-draft");
    await act(async () => root.unmount());
    expect(previewService.releaseDraft).toHaveBeenLastCalledWith("selected-draft");
    client.clear();
  });
});
