import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { useLayoutEffect, useState } from "react";
import * as PaginationPrimitive from "@animate-ui/react/primitives/pagination";
import { Select } from "@animate-ui/react/primitives/base-ui/select";
import "./Pagination.css";
import { useLocale } from "../../context/LocaleContext";
import { PageActionBar, usePageActionBarFooter } from "../layout/PageActionBar";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  itemLabel?: string;
  isFetching?: boolean;
  inActionBar?: boolean;
  revealBeforeTransitionEndMs?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  itemLabel = "items",
  isFetching = false,
  inActionBar = false,
  revealBeforeTransitionEndMs,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const { t } = useLocale();
  const actionBarFooter = usePageActionBarFooter();
  const [ready, setReady] = useState(revealBeforeTransitionEndMs === undefined);
  useLayoutEffect(() => {
    if (revealBeforeTransitionEndMs === undefined) return;
    let cancelled = false;
    let timer: number | undefined;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const elements = [actionBarFooter, document.querySelector(".sidebar__link--active"), document.querySelector('.bottom-navigation__item[aria-current="page"]')];
        const remaining = elements.flatMap((element) => element?.getAnimations({ subtree: true }) ?? [])
          .map((animation) => {
            const end = animation.effect?.getComputedTiming().endTime ?? 0;
            const current = typeof animation.currentTime === "number" ? animation.currentTime : 0;
            return Number.isFinite(end) ? Math.max(0, (end - current) / Math.abs(animation.playbackRate || 1)) : 0;
          });
        timer = window.setTimeout(() => {
          if (!cancelled) setReady(true);
        }, Math.max(0, Math.max(0, ...remaining) - revealBeforeTransitionEndMs));
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [actionBarFooter, revealBeforeTransitionEndMs]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = getPageNumbers(page, totalPages);

  const navigation = (
    <PaginationPrimitive.Root className="pagination" aria-label={t("{label} pagination", { label: t(itemLabel) })}>
      <ul className="pagination__controls" data-slot="pagination-content">
        <li data-slot="pagination-item">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1 || isFetching}
              aria-label={t("Previous page")}
            >
              <span>{t("Previous")}</span>
            </button>
          </AnimateIcon>
        </li>
        {pageNumbers.map((pageNumber, index) =>
          pageNumber === "ellipsis" ? (
            <li key={`ellipsis-${index}`} data-slot="pagination-item">
              <span data-slot="pagination-ellipsis" className="pagination-ellipsis" aria-hidden="true">
                ...
              </span>
            </li>
          ) : (
            <li key={pageNumber} data-slot="pagination-item">
              <button
                type="button"
                data-slot="pagination-link"
                data-active={page === pageNumber ? "" : undefined}
                className={`pagination-page ${page === pageNumber ? "pagination-page--active" : ""}`}
                onClick={() => onPageChange(pageNumber)}
                disabled={isFetching}
                aria-label={t("Page {page}", { page: pageNumber })}
                aria-current={page === pageNumber ? "page" : undefined}
              >
                {pageNumber}
              </button>
            </li>
          ),
        )}
        <li data-slot="pagination-item">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages || isFetching}
              aria-label={t("Next page")}
            >
              <span>{t("Next")}</span>
            </button>
          </AnimateIcon>
        </li>
      </ul>
      {onPageSizeChange ? <div className="pagination__page-size">
        <Select.Root
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          disabled={isFetching}
        >
          <Select.Trigger
            className="pagination__select-trigger"
            aria-label={t("Items per page")}
          >
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner
              className="pagination__select-positioner"
              alignItemWithTrigger={false}
              sideOffset={4}
            >
              <Select.Popup className="pagination__select-popup">
                <Select.List className="pagination__select-list">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <Select.Item key={size} value={String(size)} className="pagination__select-item">
                      <Select.ItemText>{size}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
        <span>{t("/ page")}</span>
      </div> : null}
    </PaginationPrimitive.Root>
  );

  if (!ready) return null;

  return inActionBar && actionBarFooter
    ? <PageActionBar className="pagination-action-bar">{navigation}</PageActionBar>
    : navigation;
}

function getPageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const visible = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) { visible.add(2); visible.add(3); visible.add(4); }
  if (page >= totalPages - 2) { visible.add(totalPages - 1); visible.add(totalPages - 2); visible.add(totalPages - 3); }
  const pages = [...visible].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && value - previous === 2) result.push(previous + 1);
    else if (previous !== undefined && value - previous > 2) result.push("ellipsis");
    result.push(value);
  });
  return result;
}
