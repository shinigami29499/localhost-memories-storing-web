// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onPageChange = vi.fn();
  const onPageSizeChange = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("matchMedia", vi.fn((media: string) => ({
      matches: false,
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
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function renderPagination(page: number, total: number, isFetching = false) {
    act(() => root.render(
      <Pagination
        page={page}
        pageSize={10}
        total={total}
        isFetching={isFetching}
        itemLabel="posts"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    ));
  }

  it("marks the active page for Animate UI and preserves the root between pages", () => {
    renderPagination(1, 30);
    const navigation = container.querySelector("nav");
    expect(navigation?.hasAttribute("data-animate-ui-pagination")).toBe(true);
    expect(container.querySelectorAll('[data-slot="pagination-link"]')).toHaveLength(3);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");

    renderPagination(2, 30);
    expect(container.querySelector("nav")).toBe(navigation);
    const active = container.querySelector('[aria-current="page"]');
    expect(active?.textContent).toBe("2");
    expect(active?.hasAttribute("data-active")).toBe(true);
    expect(active?.classList.contains("pagination-page--active")).toBe(true);
    expect(container.querySelectorAll("[data-active]")).toHaveLength(1);
  });

  it("supports numbered pages and stops previous and next at the boundaries", () => {
    renderPagination(1, 30);
    const previous = container.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')!;
    const next = container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!;
    expect(previous.disabled).toBe(true);
    act(() => next.click());
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Page 3"]')!.click());
    expect(onPageChange).toHaveBeenLastCalledWith(3);

    renderPagination(3, 30);
    expect(next.disabled).toBe(true);
    expect(previous.disabled).toBe(false);
    act(() => previous.click());
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it("shows nearby pages between non-interactive ellipses for long lists", () => {
    renderPagination(6, 100);
    expect(container.querySelectorAll('[data-slot="pagination-ellipsis"]')).toHaveLength(2);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("6");
    expect(container.querySelectorAll("select")).toHaveLength(1);
    expect(Array.from(container.querySelectorAll('[data-slot="pagination-link"]'), (link) => link.textContent))
      .toEqual(["1", "5", "6", "7", "10"]);
    expect(container.querySelector("button.pagination-ellipsis")).toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Page 7"]')!.click());
    expect(onPageChange).toHaveBeenCalledWith(7);
  });

  it("disables navigation and size changes while fetching", () => {
    renderPagination(6, 100, true);
    for (const control of container.querySelectorAll<HTMLButtonElement | HTMLSelectElement>("button, select")) {
      expect(control.disabled).toBe(true);
    }
  });

  it.each([0, 6, 10])("shows a single page and keeps page size available for %i items", (total) => {
    renderPagination(1, total);
    expect(container.querySelectorAll('[data-slot="pagination-link"]')).toHaveLength(1);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(true);
    const select = container.querySelector<HTMLSelectElement>(".pagination__page-size select")!;
    expect(Array.from(select.options, (option) => option.value)).toEqual(["10", "20", "50", "100"]);
    act(() => {
      select.value = "20";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });
});
