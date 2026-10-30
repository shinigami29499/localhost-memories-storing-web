import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Popover } from "@base-ui/react/popover";
import { AnimateIcon } from "../animate-ui/icons/icon";
import { CalendarDaysIcon } from "../animate-ui/icons/calendar-days";
import { ChevronLeftIcon } from "../animate-ui/icons/chevron-left";
import { ChevronRightIcon } from "../animate-ui/icons/chevron-right";
import { useLocale } from "../../context/LocaleContext";
import "./date-picker.css";

type DatePickerProps = {
  /** Selected date as `yyyy-mm-dd`, or an empty string when unset. */
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
};

const DAYS_PER_WEEK = 7;
const GRID_DAYS = 42;

function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

function isSameDay(a: Date | null, b: Date | null) {
  return !!a && !!b && toIsoDate(a) === toIsoDate(b);
}

export function DatePicker({ value, onChange, label, placeholder, className }: DatePickerProps) {
  const { t, language } = useLocale();
  const locale = language === "vi" ? "vi-VN" : "en-US";
  const weekStart = language === "vi" ? 1 : 0;
  const selected = parseIsoDate(value);
  const [open, setOpen] = useState(false);
  const [focusedDate, setFocusedDate] = useState(() => selected ?? new Date());
  const gridRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const today = new Date();

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(focusedDate),
    [focusedDate, locale],
  );
  const weekdays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const longFormatter = new Intl.DateTimeFormat(locale, { weekday: "long" });
    // 2023-01-01 was a Sunday.
    return Array.from({ length: DAYS_PER_WEEK }, (_, index) => {
      const day = new Date(2023, 0, 1 + ((index + weekStart) % DAYS_PER_WEEK));
      return { short: formatter.format(day), long: longFormatter.format(day) };
    });
  }, [locale, weekStart]);
  const dayLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    [locale],
  );
  const triggerLabel = selected
    ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(selected)
    : placeholder ?? t("Select date");

  const days = useMemo(() => {
    const firstOfMonth = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1);
    const offset = (firstOfMonth.getDay() - weekStart + DAYS_PER_WEEK) % DAYS_PER_WEEK;
    const start = addDays(firstOfMonth, -offset);
    return Array.from({ length: GRID_DAYS }, (_, index) => addDays(start, index));
  }, [focusedDate, weekStart]);

  const moveFocus = (next: Date) => {
    setFocusedDate(next);
    requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${toIsoDate(next)}"]`)?.focus();
    });
  };

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const dayOfWeek = (focusedDate.getDay() - weekStart + DAYS_PER_WEEK) % DAYS_PER_WEEK;
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusedDate, -1),
      ArrowRight: () => addDays(focusedDate, 1),
      ArrowUp: () => addDays(focusedDate, -DAYS_PER_WEEK),
      ArrowDown: () => addDays(focusedDate, DAYS_PER_WEEK),
      Home: () => addDays(focusedDate, -dayOfWeek),
      End: () => addDays(focusedDate, DAYS_PER_WEEK - 1 - dayOfWeek),
      PageUp: () => addMonths(focusedDate, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusedDate, event.shiftKey ? 12 : 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveFocus(move());
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setFocusedDate(selected ?? new Date());
        setOpen(nextOpen);
      }}
    >
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <Popover.Trigger
          className={`date-picker__trigger${selected ? " date-picker__trigger--active" : ""}${className ? ` ${className}` : ""}`}
          aria-label={selected ? `${label}: ${dayLabelFormatter.format(selected)}` : label}
        >
          <CalendarDaysIcon size={18} aria-hidden="true" />
          <span className="date-picker__value">{triggerLabel}</span>
        </Popover.Trigger>
      </AnimateIcon>
      <Popover.Portal>
        <Popover.Positioner className="date-picker__positioner" side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className="date-picker__popup" initialFocus={initialFocusRef} aria-label={label}>
            <div className="date-picker__header">
              <span className="date-picker__month" aria-live="polite">{monthLabel}</span>
              <div className="date-picker__nav">
                <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                  <button
                    type="button"
                    className="date-picker__icon-button"
                    aria-label={t("Previous month")}
                    title={t("Previous month")}
                    onClick={() => setFocusedDate(addMonths(focusedDate, -1))}
                  >
                    <ChevronLeftIcon size={18} aria-hidden="true" />
                  </button>
                </AnimateIcon>
                <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                  <button
                    type="button"
                    className="date-picker__icon-button"
                    aria-label={t("Next month")}
                    title={t("Next month")}
                    onClick={() => setFocusedDate(addMonths(focusedDate, 1))}
                  >
                    <ChevronRightIcon size={18} aria-hidden="true" />
                  </button>
                </AnimateIcon>
              </div>
            </div>

            <div className="date-picker__weekdays" aria-hidden="true">
              {weekdays.map((weekday) => (
                <span key={weekday.long} title={weekday.long}>{weekday.short}</span>
              ))}
            </div>

            <div ref={gridRef} className="date-picker__grid" role="group" aria-label={monthLabel} onKeyDown={handleGridKeyDown}>
              {days.map((day) => {
                const iso = toIsoDate(day);
                const isFocused = isSameDay(day, focusedDate);
                const isSelected = isSameDay(day, selected);
                const isToday = isSameDay(day, today);
                const outside = day.getMonth() !== focusedDate.getMonth();
                return (
                  <button
                    key={iso}
                    ref={isFocused ? initialFocusRef : undefined}
                    type="button"
                    data-date={iso}
                    tabIndex={isFocused ? 0 : -1}
                    className={[
                      "date-picker__day",
                      outside && "date-picker__day--outside",
                      isToday && "date-picker__day--today",
                      isSelected && "date-picker__day--selected",
                    ].filter(Boolean).join(" ")}
                    aria-label={dayLabelFormatter.format(day)}
                    aria-pressed={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    onClick={() => commit(iso)}
                    onFocus={() => { if (!isFocused) setFocusedDate(day); }}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="date-picker__footer">
              <button type="button" className="date-picker__text-button" disabled={!selected} onClick={() => commit("")}>
                {t("Clear")}
              </button>
              <button type="button" className="date-picker__text-button" onClick={() => commit(toIsoDate(new Date()))}>
                {t("Today")}
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
