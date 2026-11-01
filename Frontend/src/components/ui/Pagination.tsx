import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import * as PaginationPrimitive from "@animate-ui/react/primitives/pagination";
import { Select } from "@animate-ui/react/primitives/base-ui/select";
import "./Pagination.css";
import { useLocale } from "../../context/LocaleContext";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  itemLabel?: string;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  itemLabel = "items",
  isFetching = false,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const { t } = useLocale();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
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
                …
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
}

function getPageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(page - 1, totalPages - 4));
  const leadingPages = Array.from({ length: 3 }, (_, index) => start + index);
  const trailingPages = [totalPages - 1, totalPages];

  return leadingPages[2] + 1 < trailingPages[0]
    ? [...leadingPages, "ellipsis", ...trailingPages]
    : [...leadingPages, ...trailingPages];
}
