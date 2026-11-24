import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useAnimationStore } from "@/store/animationStore";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { labelDayButton, type DateRange } from "react-day-picker";
import { SelectField } from "@/components/ui/SelectField";
import { Calendar } from "@/components/ui/calendar";
import { useLocale } from "@/context/LocaleContext";
import "./dropdown-range-date-picker.css";

type Props = { from: string; to: string; onChange: (from: string, to: string) => void; container?: RefObject<HTMLElement | null>; markedDates?: string[] };
function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}
function isoDate(date?: Date) { return date ? format(date, "yyyy-MM-dd") : ""; }
export function DropdownRangeDatePicker({ from, to, onChange, container, markedDates = [] }: Props) {
  const { t, language } = useLocale();
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const reducedMotion = useReducedMotion();
  const start = parseDate(from), end = parseDate(to);
  const markedDays = new Set(markedDates.flatMap((value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? [] : [isoDate(date)]; }));
  const selected: DateRange | undefined = start ? { from: start, to: end } : undefined;
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendarHeight, setCalendarHeight] = useState<number | "auto">("auto");
  useEffect(() => {
    const element = calendarRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) setCalendarHeight(entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const currentYear = Math.max(2025, new Date().getFullYear());
  const [month, setMonth] = useState(() => {
    const initial = start ?? end ?? new Date();
    return new Date(Math.min(currentYear, Math.max(2025, initial.getFullYear())), initial.getMonth(), 1);
  });
  return <div className="range-picker">
    <div className="range-picker__selectors">
      <SelectField label={t("Year")} value={String(month.getFullYear())} container={container} disableItemAnimation onChange={(value) => setMonth(new Date(Number(value), month.getMonth(), 1))} options={Array.from({ length: currentYear - 2025 + 1 }, (_, i) => { const year = 2025 + i; return { value: String(year), label: String(year), indicator: [...markedDays].some((day) => day.startsWith(`${year}-`)) ? t("Has users") : undefined }; })} />
      <SelectField label={t("Month")} value={String(month.getMonth())} container={container} disableItemAnimation onChange={(value) => setMonth(new Date(month.getFullYear(), Number(value), 1))} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", { month: "long" }).format(new Date(2000, i, 1)), indicator: [...markedDays].some((day) => day.startsWith(`${month.getFullYear()}-${String(i + 1).padStart(2, "0")}-`)) ? t("Has users") : undefined }))} />
    </div>
    <motion.div initial={false} animate={{ height: calendarHeight }} transition={{ duration: animationsEnabled && !reducedMotion ? 0.22 : 0, ease: "easeOut" }} className="range-picker__calendar">
    <div ref={calendarRef}><Calendar navLayout="around" startMonth={new Date(2025, 0, 1)} endMonth={new Date(currentYear, 11, 1)} disabled={{ before: new Date(2025, 0, 1), after: new Date(currentYear, 11, 31) }} modifiers={{ hasUsers: (date) => markedDays.has(isoDate(date)) }} modifiersClassNames={{ hasUsers: "range-picker__has-users" }} labels={{ labelDayButton: (...args) => `${labelDayButton(...args)}${markedDays.has(isoDate(args[0])) ? `, ${t("Has users")}` : ""}` }} mode="range" selected={selected} onSelect={(range) => onChange(isoDate(range?.from), isoDate(range?.to))} month={month} onMonthChange={setMonth} locale={language === "vi" ? vi : undefined} /></div>
    </motion.div>
  </div>;
}
