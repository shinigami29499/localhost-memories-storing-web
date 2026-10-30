// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { userService } from "../../features/users/services/userService";
import type { AuthUser } from "../../features/auth/types";
import { useAuthStore } from "../../store/authStore";
import { ProfilePage } from "./ProfilePage";

vi.mock("../../features/users/services/userService", () => ({
  userService: { profile: vi.fn(), setAvatar: vi.fn() },
}));

const user: AuthUser = {
  id: "profile-user",
  username: "alice",
  role: "user",
  status: "active",
  createdAt: "2026-10-30T00:00:00Z",
  avatarSeed: "saved-avatar",
};

describe("ProfilePage avatars", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  const radios = () => [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  const button = (text: string) => [...container.querySelectorAll("button")]
    .find((element) => element.textContent === text)!;
  const render = async () => {
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <LocaleProvider><ProfilePage /></LocaleProvider>
      </QueryClientProvider>,
    ));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };
  const ready = async () => {
    await render();
    await vi.waitFor(() => expect(radios()).toHaveLength(8));
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    localStorage.clear();
    useAuthStore.getState().setSession({
      user: { ...user, avatarSeed: null },
      accessToken: "access",
      refreshToken: "refresh",
      accessTokenExpiresAtUtc: "2026-11-01T00:00:00Z",
    });
    vi.mocked(userService.profile).mockResolvedValue(user);
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    useAuthStore.getState().clear();
    vi.unstubAllGlobals();
  });

  it("loads the saved avatar and renders the real avatar library", async () => {
    await ready();
    expect(useAuthStore.getState().user?.avatarSeed).toBe("saved-avatar");
    expect(container.querySelector(".profile-page__avatar svg")).not.toBeNull();
    expect(radios().filter((radio) => radio.checked)).toHaveLength(1);
    expect(button("Save avatar").disabled).toBe(true);
    const savedMarkup = container.querySelector(".profile-page__avatar")!.innerHTML;
    await act(async () => root.render(null));
    await ready();
    expect(container.querySelector(".profile-page__avatar")!.innerHTML).toBe(savedMarkup);
  });

  it("previews, cancels, and loads more choices without saving", async () => {
    await ready();
    const originalChoices = radios().map((radio) => radio.value);
    await act(async () => radios()[1].click());
    expect(button("Save avatar").disabled).toBe(false);
    expect(useAuthStore.getState().user?.avatarSeed).toBe("saved-avatar");
    await act(async () => button("Cancel").click());
    expect(radios()[0].checked).toBe(true);
    await act(async () => button("More avatars").click());
    expect(radios().map((radio) => radio.value)).not.toEqual(originalChoices);
    expect(radios()[0].checked).toBe(true);
    expect(userService.setAvatar).not.toHaveBeenCalled();
  });

  it("saves the chosen seed, updates profile caches, and preserves tokens", async () => {
    await ready();
    const seed = radios()[1].value;
    vi.mocked(userService.setAvatar).mockResolvedValue({ ...user, avatarSeed: seed });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await act(async () => radios()[1].click());
    await act(async () => button("Save avatar").click());
    await vi.waitFor(() => expect(useAuthStore.getState().user?.avatarSeed).toBe(seed));
    expect(userService.setAvatar).toHaveBeenCalledWith(seed, expect.anything());
    expect(client.getQueryData(["profile", user.id])).toMatchObject({ avatarSeed: seed });
    expect(useAuthStore.getState()).toMatchObject({ accessToken: "access", refreshToken: "refresh" });
    expect(JSON.parse(localStorage.getItem("shinigacim-auth")!).state.user.avatarSeed).toBe(seed);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["albums"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(new Set(radios().map((radio) => radio.value)).size).toBe(8);
    expect(radios().filter((radio) => radio.checked)).toHaveLength(1);
  });

  it("keeps the saved avatar on failure and permits retry", async () => {
    await ready();
    vi.mocked(userService.setAvatar).mockRejectedValueOnce(new Error("offline"));
    const seed = radios()[1].value;
    await act(async () => radios()[1].click());
    await act(async () => button("Save avatar").click());
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent)
      .toContain("Could not save avatar."));
    expect(useAuthStore.getState().user?.avatarSeed).toBe("saved-avatar");
    expect(button("Save avatar").disabled).toBe(false);
    vi.mocked(userService.setAvatar).mockResolvedValueOnce({ ...user, avatarSeed: seed });
    await act(async () => button("Save avatar").click());
    await vi.waitFor(() => expect(useAuthStore.getState().user?.avatarSeed).toBe(seed));
  });

  it("disables avatar controls while saving", async () => {
    await ready();
    let finish!: (value: AuthUser) => void;
    vi.mocked(userService.setAvatar).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const seed = radios()[1].value;
    await act(async () => radios()[1].click());
    await act(async () => button("Save avatar").click());
    await vi.waitFor(() => expect(container.querySelector("fieldset")?.disabled).toBe(true));
    expect(button("More avatars").disabled).toBe(true);
    expect(button("Save avatar").getAttribute("aria-busy")).toBe("true");
    await act(async () => finish({ ...user, avatarSeed: seed }));
  });

  it("surfaces profile loading failures and retries", async () => {
    vi.mocked(userService.profile).mockRejectedValueOnce(new Error("offline"));
    await render();
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent)
      .toBe("Could not load your profile."));
    expect(radios()).toHaveLength(0);
    await act(async () => button("Try again").click());
    await vi.waitFor(() => expect(radios()).toHaveLength(8));
  });
});
