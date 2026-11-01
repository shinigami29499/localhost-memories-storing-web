// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PLACE_MARKER_COLOR, DEFAULT_PLACE_MARKER_ICON } from "../types";
import { PlaceEditor, type PlaceFormValues } from "./PlaceEditor";

vi.mock("./PlaceMarkerCombobox", () => ({
  PlaceMarkerCombobox: () => <div data-marker-combobox />,
}));

describe("PlaceEditor", () => {
  let container: HTMLDivElement;
  let root: Root;
  const values: PlaceFormValues = {
    name: "Peace Vegan",
    address: "",
    note: "",
    rating: 0,
    markerIcon: DEFAULT_PLACE_MARKER_ICON,
    markerColor: DEFAULT_PLACE_MARKER_COLOR,
    mediaIds: [],
  };
  const coordinate = { latitude: 10, longitude: 20 };

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("SVGGeometryElement", class extends SVGElement {});
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each([true, false])("places save and cancel after the rating for isNew=%s", async (isNew) => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const onChange = vi.fn();
    await act(async () => {
      root.render(
        <PlaceEditor
          values={values}
          coordinate={coordinate}
          saving={false}
          isNew={isNew}
          error={null}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
      );
    });

    const form = container.querySelector<HTMLFormElement>("form");
    const rating = form?.querySelector<HTMLElement>(".place__rating-field");
    const actions = form?.querySelector<HTMLElement>(".place__form-actions");
    expect(rating).not.toBeNull();
    expect(form?.lastElementChild).toBe(actions);
    expect(Array.from(actions?.querySelectorAll("button") ?? [], (button) => button.textContent))
      .toEqual([isNew ? "Save place" : "Save changes", "Cancel"]);
    expect(container.querySelector(".place__photo-list")).toBeNull();
    expect(container.textContent).not.toContain("Add photos");
    expect(container.textContent).not.toContain("Change photos");

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Rate 4 of 5 stars"]')?.click();
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      actions?.querySelector<HTMLButtonElement>('button[type="button"]')?.click();
    });
    expect(onChange).toHaveBeenCalledWith({ ...values, rating: 4 });
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("preserves controls for previously linked photos without allowing additions", async () => {
    const existing = { ...values, mediaIds: ["photo-a", "photo-b"] };
    const onChange = vi.fn();
    await act(async () => {
      root.render(
        <PlaceEditor
          values={existing}
          coordinate={coordinate}
          saving={false}
          isNew={false}
          error={null}
          onChange={onChange}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
    });

    expect(container.querySelectorAll(".place__photo-list img")).toHaveLength(2);
    expect(container.textContent).not.toContain("Add photos");
    expect(container.textContent).not.toContain("Change photos");
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Set photo 2 as cover"]')?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith({ ...existing, mediaIds: ["photo-b", "photo-a"] });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Remove photo 1"]')?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith({ ...existing, mediaIds: ["photo-b"] });
  });
});
