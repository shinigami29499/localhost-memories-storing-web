import { addMonths, clamp, eachMonthOfInterval, eachYearOfInterval, format, isSameMonth, parseISO, startOfDay, startOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { motion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { labelDayButton } from "react-day-picker";
import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/calendar";
import { SelectField } from "@/components/ui/SelectField";
import { useLocale } from "@/context/LocaleContext";
import type { useInfiniteAlbums } from "../hooks/useAlbums";
import "./album-date-sheet.css";

export type AlbumDateHistory = Pick<ReturnType<typeof useInfiniteAlbums>,
  "data" | "fetchNextPage" | "refetch" | "isFetching" | "isPending" | "isFetchNextPageError" | "isError">;

type CalendarProps = {
  today: Date;
  selectedDate: Date;
  albumDateCounts: ReadonlyMap<string, number>;
};

type SheetProps = CalendarProps & {
  history: AlbumDateHistory;
  animate: boolean;
  onSelect: (date: Date) => void;
  onDismiss: () => void;
};

const heatLevels = [1, 2, 3];
const firstCalendarDate = new Date(2020, 0, 1);

export function AlbumDateSheet({ today, selectedDate, albumDateCounts, history, animate, onSelect, onDismiss }: SheetProps) {
  const { t } = useLocale();
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const scrollBody = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number; inBody: boolean } | null>(null);
  const [draft, setDraft] = useState(() => startOfDay(selectedDate));
  const [closing, setClosing] = useState(false);
  const lastPage = history.data?.pages.at(-1);
  const cursor = lastPage?.hasMore ? lastPage.nextCursor : null;
  const hasMore = Boolean(cursor && !history.data?.pageParams.includes(cursor));
  const { fetchNextPage, isFetching, isPending, isError, isFetchNextPageError } = history;
  const pending = isPending || (hasMore && !isError);
  const failed = isError && (hasMore || !history.data);
  const interval = { start: firstCalendarDate, end: new Date(today.getFullYear(), 11, 1) };
  const canConfirm = draft >= interval.start && draft <= startOfDay(today);

  useEffect(() => {
    if (!closing && hasMore && !isFetching && !isError) void fetchNextPage({ cancelRefetch: false });
  }, [closing, fetchNextPage, hasMore, isError, isFetching]);

  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    title.current?.focus({ preventScroll: true });
    return () => element?.close();
  }, []);

  const finishClose = () => {
    dialog.current?.close();
    onDismiss();
  };
  const close = () => {
    if (animate) setClosing(true);
    else finishClose();
  };

  return (
    <dialog ref={dialog} className="album-date-sheet" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); close(); }}>
      <motion.div aria-hidden="true" className="album-date-sheet__scrim"
        initial={animate ? { opacity: 0 } : false} animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: animate ? .08 : 0, delay: closing && animate ? .24 : 0 }}
        onAnimationComplete={() => { if (closing) finishClose(); }}
        onClick={close} />
      <motion.section className="album-date-sheet__panel"
        initial={animate ? { y: "100%" } : false} animate={{ y: closing && animate ? "100%" : 0 }}
        transition={{ duration: animate ? .24 : 0, delay: !closing && animate ? .08 : 0, ease: closing ? "easeIn" : "easeOut" }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          const inBody = event.target instanceof Node && Boolean(scrollBody.current?.contains(event.target));
          touchStart.current = event.touches.length === 1 && (!inBody || !scrollBody.current?.scrollTop)
            ? { x: touch.clientX, y: touch.clientY, inBody } : null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start || (start.inBody && scrollBody.current?.scrollTop)) return;
          const touch = event.changedTouches[0];
          const dy = touch.clientY - start.y;
          if (dy >= 64 && dy > Math.abs(touch.clientX - start.x)) close();
        }}
        onTouchCancel={() => { touchStart.current = null; }}>
        <header className="album-date-sheet__header">
          <span className="album-date-sheet__handle" aria-hidden="true" />
          <h2 ref={title} id={titleId} tabIndex={-1}>{t("Select date")}</h2>
        </header>
        <div ref={scrollBody} className="album-date-sheet__body" aria-busy={pending}>
          <AlbumSheetCalendar today={today} selectedDate={selectedDate} albumDateCounts={albumDateCounts}
            dialog={dialog} interval={interval} draft={draft} onDraftChange={setDraft} />
          {failed && (
            <div className="album-date-sheet__status">
              <p>{t("Could not load albums.")}</p>
              <button type="button" disabled={isFetching} onClick={() => {
                if (isFetchNextPageError) void fetchNextPage();
                else void history.refetch();
              }}>{t("Retry")}</button>
            </div>
          )}
        </div>
        <footer className="album-date-sheet__footer">
          <Button type="button" disabled={!canConfirm || pending || failed || closing} onClick={() => {
            if (!canConfirm) return;
            onSelect(draft);
            close();
          }}>{t("Done")}</Button>
        </footer>
      </motion.section>
    </dialog>
  );
}

function AlbumSheetCalendar({ today, selectedDate, albumDateCounts, dialog, interval, draft, onDraftChange }: CalendarProps & {
  dialog: React.RefObject<HTMLDialogElement | null>;
  interval: { start: Date; end: Date };
  draft: Date;
  onDraftChange: (date: Date) => void;
}) {
  const { t, language } = useLocale();
  const { yearsWithAlbums, monthsWithAlbums } = useMemo(() => {
    const dates = Array.from(albumDateCounts.keys());
    return {
      yearsWithAlbums: new Set(dates.map((date) => date.slice(0, 4))),
      monthsWithAlbums: new Set(dates.map((date) => date.slice(0, 7))),
    };
  }, [albumDateCounts]);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const month = clamp(viewMonth, interval);
  const year = month.getFullYear();
  const monthLabel = new Intl.DateTimeFormat(language, { month: "long" });
  const yearOptions = eachYearOfInterval(interval).map((date) => {
    const label = format(date, "yyyy");
    return { value: label, label, indicator: yearsWithAlbums.has(label) ? t("Has albums") : undefined };
  });
  const monthOptions = eachMonthOfInterval({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 1),
  }).map((date) => {
    const key = format(date, "yyyy-MM");
    return { value: key, label: monthLabel.format(date), indicator: monthsWithAlbums.has(key) ? t("Has albums") : undefined };
  });
  const selected = isSameMonth(draft, month) ? draft : undefined;
  const changeMonth = (next: Date) => setViewMonth(clamp(startOfMonth(next), interval));
  const heatModifiers = Object.fromEntries(heatLevels.map((level) => [`heat${level}`, (date: Date) =>
    Math.min(albumDateCounts.get(format(date, "yyyy-MM-dd")) ?? 0, heatLevels.length) === level,
  ]));

  return (
    <>
      <div className="album-date-sheet__fields">
        <SelectField label={t("Month")} value={format(month, "yyyy-MM")} options={monthOptions} container={dialog} centerSelectedOnOpen
          onChange={(value) => changeMonth(parseISO(`${value}-01`))} />
        <SelectField label={t("Year")} value={format(month, "yyyy")} options={yearOptions} container={dialog} centerSelectedOnOpen
          onChange={(value) => changeMonth(new Date(Number(value), month.getMonth(), 1))} />
      </div>
      <div onTouchStart={(event) => {
        const target = event.target;
        const touch = event.touches[0];
        swipeStart.current = event.touches.length === 1 && target instanceof Element && target.closest(".rdp-month_grid")
          ? { x: touch.clientX, y: touch.clientY } : null;
      }} onTouchEnd={(event) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (!start || event.changedTouches.length !== 1) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
        event.preventDefault();
        changeMonth(addMonths(month, dx < 0 ? 1 : -1));
      }} onTouchCancel={() => { swipeStart.current = null; }}>
      <Calendar mode="single" required selected={selected} month={month} onMonthChange={changeMonth}
        locale={language === "vi" ? vi : undefined} today={today}
        startMonth={interval.start} endMonth={interval.end} navLayout="around"
        disabled={[{ after: startOfDay(today) }, { before: interval.start }]}
        modifiers={heatModifiers}
        modifiersClassNames={Object.fromEntries(heatLevels.map((level) => [`heat${level}`, `album-date-sheet__heat-${level}`]))}
        labels={{ labelDayButton: (...args) => {
          const label = labelDayButton(...args);
          const count = albumDateCounts.get(format(args[0], "yyyy-MM-dd")) ?? 0;
          if (count === 0) return label;
          return `${label}, ${t(count === 1 ? "1 album" : "{count} albums", { count })}`;
        } }}
        onSelect={onDraftChange} />
      </div>
    </>
  );
}
