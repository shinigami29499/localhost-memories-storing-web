// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../../../../src/context/LocaleContext";
import { useAuthStore } from "../../../../../../src/store/authStore";
import type { AuthUser } from "../../../../../../src/features/auth/types";
import { MobileAvatarPicker } from "../../../../../../apps/mobile/src/MobileAvatarPicker";

const { setAvatar } = vi.hoisted(() => ({ setAvatar: vi.fn() }));
vi.mock("../../../../../../src/features/users/services/userService", () => ({ userService: { setAvatar } }));
vi.mock("../../../../../../src/components/ui/Toast", () => ({ showToast: { success: vi.fn() } }));
vi.mock("../../../../../../src/components/common/UserAvatar", () => ({ UserAvatar: () => <span /> }));
vi.mock("../../../../../../src/components/ui/Pagination", () => ({ Pagination: () => null }));

it("saves the chosen avatar without overwriting a different signed-in user", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const user: AuthUser = { id: "first", username: "First", role: "user", status: "active", createdAt: "2026-01-01" };
  const other: AuthUser = { ...user, id: "other", username: "Other" };
  let resolve!: (user: AuthUser) => void;
  setAvatar.mockReturnValue(new Promise<AuthUser>((done) => { resolve = done; }));
  useAuthStore.setState({ user });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const element = document.createElement("div");
  document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<LocaleProvider><QueryClientProvider client={client}><MobileAvatarPicker user={user} /></QueryClientProvider></LocaleProvider>));
    const option = element.querySelector<HTMLInputElement>('input[aria-label="Avatar 1"]')!;
    await act(async () => option.click());
    expect(option.checked).toBe(true);
    await act(async () => element.querySelector<HTMLFormElement>("form")!.requestSubmit());
    expect(setAvatar).toHaveBeenCalledWith("first:avatar:0:0", expect.anything());
    await act(async () => useAuthStore.setState({ user: other }));
    await act(async () => resolve({ ...user, avatarSeed: "first:avatar:0:0" }));
    expect(useAuthStore.getState().user?.id).toBe("other");
    expect(client.getQueryData(["profile", "first"])).toBeUndefined();
  } finally {
    await act(async () => root.unmount());
    client.clear(); element.remove(); useAuthStore.getState().clear(); vi.unstubAllGlobals();
  }
});
