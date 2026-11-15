// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../../../src/context/LocaleContext";
import { sessionReplacedEvent } from "../../../../../src/features/auth/sessionReplacement";
import { useSessionReplacedDialog } from "../../../../../src/features/auth/useSessionReplacedDialog";

function Harness() {
  const { dialogProps, close } = useSessionReplacedDialog();
  return <button type="button" aria-expanded={dialogProps.open} onClick={() => close()}>Dismiss</button>;
}

it("clears cached data and opens the dialog when the session is replaced", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const client = new QueryClient(); client.setQueryData(["private"], "value");
  const element = document.createElement("div"); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<LocaleProvider><QueryClientProvider client={client}><Harness /></QueryClientProvider></LocaleProvider>));
    expect(element.querySelector("button")?.getAttribute("aria-expanded")).toBe("false");
    await act(async () => window.dispatchEvent(new Event(sessionReplacedEvent)));
    expect(client.getQueryData(["private"])).toBeUndefined();
    expect(element.querySelector("button")?.getAttribute("aria-expanded")).toBe("true");
    await act(async () => element.querySelector("button")!.click());
    expect(element.querySelector("button")?.getAttribute("aria-expanded")).toBe("false");
  } finally {
    await act(async () => root.unmount()); client.clear(); element.remove(); vi.unstubAllGlobals();
  }
});
