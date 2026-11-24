// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { uploadService } from "../../../../../src/features/uploads/services/uploadService";
import { useUploadManagement } from "../../../../../src/pages/uploads/useUploadManagement";

vi.mock("../../../../../src/features/uploads/services/uploadService", () => ({
  uploadService: { list: vi.fn(), listAll: vi.fn() },
}));
vi.mock("../../../../../src/features/uploads/services/uploadRuntime", () => ({}));
vi.mock("../../../../../src/features/uploads/hooks/useUnreadUploads", () => {
  const syncSeenStatus = vi.fn();
  return { useUnreadUploads: () => ({ syncSeenStatus }) };
});

it("aborts the obsolete upload list and requests only the final date", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const root = createRoot(document.createElement("div"));
  let changeDate: (date: string) => void = () => {};
  const list = vi.mocked(uploadService.list).mockImplementation(() => new Promise(() => {}));

  function Page() {
    const [, setParams] = useSearchParams();
    changeDate = (date) => setParams({ date });
    useUploadManagement();
    return null;
  }

  try {
    await act(async () => root.render(
      <QueryClientProvider client={client}><MemoryRouter><Page /></MemoryRouter></QueryClientProvider>,
    ));
    expect(list).toHaveBeenCalledTimes(1);
    const initialSignal = list.mock.calls[0][3];
    act(() => changeDate("2026-11-18"));
    expect(initialSignal?.aborted).toBe(true);
    act(() => { vi.advanceTimersByTime(200); });
    act(() => changeDate("2026-11-20"));
    act(() => { vi.advanceTimersByTime(299); });
    expect(list).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[1][2]).toBe("2026-11-20");
  } finally {
    act(() => root.unmount());
    client.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
