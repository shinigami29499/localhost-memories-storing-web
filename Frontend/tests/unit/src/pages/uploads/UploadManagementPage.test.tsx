// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../../../src/context/LocaleContext";
import { useUploadProgress, type AlbumTransfer } from "../../../../../src/features/uploads/uploadProgress";
import { useAuthStore } from "../../../../../src/store/authStore";
import { UploadManagementPage } from "../../../../../src/pages/uploads/UploadManagementPage";

it("renders one compact cached row per file for the current account", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.localStorage.clear();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const completed: AlbumTransfer = {
    id: "own", userId: "viewer", albumId: "album", name: "own.jpg", status: "success",
    createdAt: "2026-10-28T00:00:00Z", loaded: 10, total: 10,
  };
  useAuthStore.setState({ user: { id: "viewer", username: "viewer", role: "admin", status: "active", createdAt: "" } });
  useUploadProgress.setState({ transfers: { own: completed, other: { ...completed, id: "other", name: "other.jpg", userId: "other" } } });
  try {
    await act(async () => root.render(<LocaleProvider><UploadManagementPage /></LocaleProvider>));
    const rows = container.querySelectorAll(".file-upload-progress--compact");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("own.jpg");
    expect(rows[0].textContent).not.toContain("other.jpg");
    expect(container.querySelector("input, a")).toBeNull();
    expect(container.textContent).not.toContain("Mark all as read");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    useUploadProgress.setState({ transfers: {} });
    useAuthStore.getState().clear();
    vi.unstubAllGlobals();
  }
});
