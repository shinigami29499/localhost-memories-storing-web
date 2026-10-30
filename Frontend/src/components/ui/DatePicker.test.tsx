// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { DatePicker } from "./DatePicker";

function Harness({ initial, onChange }: { initial: string; onChange: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <DatePicker
      label="Created date"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("DatePicker", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 30, 12));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const render = async (initial: string, onChange = vi.fn()) => {
    await act(async () => root.render(
      <LocaleProvider>
        <AnimateUIProvider reducedMotion="always">
          <Harness initial={initial} onChange={onChange} />
        </AnimateUIProvider>
      </LocaleProvider>,
    ));
    return onChange;
  };

  const trigger = () => container.querySelector<HTMLButtonElement>("button.date-picker__trigger")!;
  const open = async () => {
    await act(async () => trigger().click());
    await act(async () => {
      await vi.waitFor(() => expect(document.querySelector(".date-picker__popup")).not.toBeNull());
    });
  };

  it("selects a day from the calendar", async () => {
    const onChange = await render("");
    expect(trigger().textContent).toContain("Select date");

    await open();
    expect(document.querySelector(".date-picker__month")?.textContent).toBe("October 2026");
    expect(document.querySelector('[aria-current="date"]')?.getAttribute("data-date")).toBe("2026-10-30");

    await act(async () => document.querySelector<HTMLButtonElement>('[data-date="2026-10-12"]')!.click());
    expect(onChange).toHaveBeenLastCalledWith("2026-10-12");
    expect(trigger().classList).toContain("date-picker__trigger--active");
    expect(trigger().textContent).toContain("10/12/2026");
  });

  it("navigates months and supports clear and today", async () => {
    const onChange = await render("2026-01-31");
    await open();
    expect(document.querySelector('[data-date="2026-01-31"]')?.getAttribute("aria-pressed")).toBe("true");

    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Next month"]')!.click());
    expect(document.querySelector(".date-picker__month")?.textContent).toBe("February 2026");

    await act(async () => {
      [...document.querySelectorAll<HTMLButtonElement>(".date-picker__text-button")]
        .find((button) => button.textContent === "Clear")!.click();
    });
    expect(onChange).toHaveBeenLastCalledWith("");

    await open();
    await act(async () => {
      [...document.querySelectorAll<HTMLButtonElement>(".date-picker__text-button")]
        .find((button) => button.textContent === "Today")!.click();
    });
    expect(onChange).toHaveBeenLastCalledWith("2026-10-30");
  });
});
