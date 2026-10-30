import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./authStore";
import type { AuthSession } from "../features/auth/types";

const session: AuthSession = {
  accessToken: "at-1",
  refreshToken: "rt-1",
  accessTokenExpiresAtUtc: "2025-01-01T00:00:00Z",
  user: { id: "u-1", username: "alice", role: "User", status: "active", createdAt: "2025-01-01T00:00:00Z" },
};

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it("starts without a session", () => {
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("stores the token pair and user on login", () => {
    useAuthStore.getState().setSession(session);
    expect(useAuthStore.getState().accessToken).toBe("at-1");
    expect(useAuthStore.getState().refreshToken).toBe("rt-1");
    expect(useAuthStore.getState().user?.username).toBe("alice");
  });

  it("replaces tokens on refresh rotation", () => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().setTokens("at-2", "rt-2");
    expect(useAuthStore.getState()).toMatchObject({ accessToken: "at-2", refreshToken: "rt-2" });
    expect(useAuthStore.getState().user?.username).toBe("alice");
  });

  it("clear() removes the session for logout", () => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().clear();
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, refreshToken: null, user: null });
  });

  it("updates the current profile without replacing tokens", () => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().updateUser({ ...session.user, avatarSeed: "chosen-avatar" });
    expect(useAuthStore.getState().user?.avatarSeed).toBe("chosen-avatar");
    expect(useAuthStore.getState()).toMatchObject({ accessToken: "at-1", refreshToken: "rt-1" });
  });

  it("ignores profile responses for another account or a cleared session", () => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().updateUser({ ...session.user, id: "another-user", avatarSeed: "other-avatar" });
    expect(useAuthStore.getState().user).toEqual(session.user);
    useAuthStore.getState().clear();
    useAuthStore.getState().updateUser(session.user);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
