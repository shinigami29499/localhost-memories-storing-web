import { useId } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import * as PaginationPrimitive from "@animate-ui/react/primitives/pagination";
import { ChevronLeft } from "@/components/animate-ui/icons/chevron-left";
import { ChevronRight } from "@/components/animate-ui/icons/chevron-right";
import "./Pagination.css";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  itemLabel?: string;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
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
  const pageSelectId = useId();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <PaginationPrimitive.Root className="pagination" aria-label={`${itemLabel} pagination`}>
      <ul className="pagination__controls" data-slot="pagination-content">
        <li data-slot="pagination-item">
          <AnimateIcon animateOnHover asChild>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1 || isFetching}
              aria-label="Previous page"
            >
              <ChevronLeft size={18} aria-hidden="true" />
              <span>Previous</span>
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
                aria-label={`Page ${pageNumber}`}
                aria-current={page === pageNumber ? "page" : undefined}
              >
                {pageNumber}
              </button>
            </li>
          ),
        )}
        <li data-slot="pagination-item">
          <AnimateIcon animateOnHover asChild>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages || isFetching}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </AnimateIcon>
        </li>
      </ul>
      <label className="pagination__page-size" htmlFor={`${pageSelectId}-size`}>
        <select
          id={`${pageSelectId}-size`}
          aria-label="Items per page"
          value={pageSize}
          disabled={isFetching}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        <span>/ page</span>
      </label>
    </PaginationPrimitive.Root>
  );
}

function getPageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 4) return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  if (page >= totalPages - 3) return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages];
}
