// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { PlaceEditor, type PlaceFormValues } from "./PlaceEditor";
import { PhotoPicker } from "../../media/components/PhotoPicker";
import type { MediaFile } from "../../media/types";
import { DEFAULT_PLACE_MARKER_COLOR, DEFAULT_PLACE_MARKER_ICON } from "../types";

vi.mock("./PlaceMarkerCombobox", () => ({ PlaceMarkerCombobox: () => null }));
vi.mock("../../media/components/PhotoPicker", () => ({ PhotoPicker: vi.fn(() => null) }));

describe("PlaceEditor preview replacement", () => {
  it.each([true, false])("unlinks only a replaced preview-only cover (isPreviewOnly=%s)", async (isPreviewOnly) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("SVGGeometryElement", class extends SVGElement {});
    const client = new QueryClient();
    const values: PlaceFormValues = {
      name: "Place", address: "", note: "",
      markerIcon: DEFAULT_PLACE_MARKER_ICON, markerColor: DEFAULT_PLACE_MARKER_COLOR,
      mediaIds: ["old-cover", "other-gallery"],
    };
    const oldCover: MediaFile = {
      id: "old-cover", originalFilename: "cover.jpg", mediaKind: "image", mimeType: "image/jpeg",
      fileSizeBytes: 20, createdAt: "2026-11-01T00:00:00Z", isFavorited: false, isPreviewOnly,
    };
    const selected = { ...oldCover, id: "selected-gallery", isPreviewOnly: false };
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const container = document.createElement("div");
    const editorRoot = createRoot(container);
    try {
      await act(async () => editorRoot.render(
        <QueryClientProvider client={client}>
          <PlaceEditor values={values} coordinate={{ latitude: 10, longitude: 20 }}
            saving={false} isNew={false} error={null}
            onChange={onChange} onSubmit={onSubmit} onCancel={vi.fn()} />
        </QueryClientProvider>,
      ));
      await act(async () => container.querySelector<HTMLButtonElement>(".place__choose-photos")!.click());
      const pickerProps = vi.mocked(PhotoPicker).mock.calls.at(-1)![0];
      await act(async () => pickerProps.onConfirm(selected, oldCover));
      expect(onChange).toHaveBeenCalledWith({
        ...values,
        mediaIds: isPreviewOnly
          ? ["selected-gallery", "other-gallery"]
          : ["selected-gallery", "old-cover", "other-gallery"],
      });
      expect(onSubmit).not.toHaveBeenCalled();
    } finally {
      await act(async () => editorRoot.unmount());
      client.clear();
      vi.unstubAllGlobals();
      vi.clearAllMocks();
    }
  });
});
