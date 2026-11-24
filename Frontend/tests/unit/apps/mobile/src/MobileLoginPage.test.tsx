// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { LoginPage } from "../../../../../apps/mobile/src/MobileLoginPage";
import { authService } from "@/features/auth";

vi.mock("react-router-dom", () => ({ Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>, useNavigate: () => vi.fn() }));
vi.mock("@/features/auth", () => ({ authService: { login: vi.fn() } }));
vi.mock("@/store/authStore", () => ({ useAuthStore: { getState: () => ({ setSession: vi.fn() }) } }));
vi.mock("@/context/LocaleContext", () => ({ useLocale: () => ({ t: (value: string) => value }) }));
vi.mock("@/components/ui", () => ({ showToast: { success: vi.fn(), error: vi.fn() }, PasswordInput: () => <input /> }));
vi.mock("@/components/ui/LanguageToggleButton", () => ({ LanguageToggleButton: () => null }));

afterEach(() => vi.restoreAllMocks());

it("blocks repeated sign-in submits and allows retry after failure", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let reject!: (reason: Error) => void;
  vi.mocked(authService.login).mockImplementationOnce(() => new Promise((_resolve, rejectRequest) => { reject = rejectRequest; }));
  vi.mocked(authService.login).mockRejectedValueOnce(new Error("retry failed"));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<LoginPage />));
  const form = container.querySelector("form")!;
  const button = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(authService.login).toHaveBeenCalledTimes(1);
  expect(button.disabled).toBe(true);
  expect(button.textContent).toBe("Signing in...");
  await act(async () => { reject(new Error("failed")); });
  expect(button.disabled).toBe(false);
  await act(async () => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  expect(authService.login).toHaveBeenCalledTimes(2);
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
