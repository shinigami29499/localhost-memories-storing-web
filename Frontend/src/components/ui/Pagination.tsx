import { useId, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const pageSelectRef = useRef<HTMLSelectElement>(null);
  const totalPages = Math.ceil(total / pageSize);
  const pageNumbers = getPageNumbers(page, totalPages);

  const openPagePicker = () => {
    const select = pageSelectRef.current;
    if (!select) return;

    select.focus();
    (select as HTMLSelectElement & { showPicker?: () => void }).showPicker?.();
  };

  return (
    <nav className="pagination" aria-label={`${itemLabel} pagination`}>
      <div className="pagination__summary">
        <label className="pagination__page-size" htmlFor={`${pageSelectId}-size`}>
          Items per page
          <select
            id={`${pageSelectId}-size`}
            value={pageSize}
            disabled={isFetching}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>

      {totalPages > 1 ? (
        <div className="pagination__controls">
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

          <div className="pagination__pages">
            {pageNumbers.map((pageNumber, index) =>
              pageNumber === "ellipsis" ? (
                <button
                  key={`ellipsis-${index}`}
                  type="button"
                  className="pagination-ellipsis"
                  onClick={openPagePicker}
                  disabled={isFetching}
                  aria-label="Select a page"
                  title="Select a page"
                >
                  …
                </button>
              ) : (
                <button
                  key={pageNumber}
                  type="button"
                  className={`pagination-page ${page === pageNumber ? "pagination-page--active" : ""}`}
                  onClick={() => onPageChange(pageNumber)}
                  disabled={isFetching}
                  aria-label={`Page ${pageNumber}`}
                  aria-current={page === pageNumber ? "page" : undefined}
                >
                  {pageNumber}
                </button>
              ),
            )}
          </div>

          <label className="pagination__page-select" htmlFor={pageSelectId}>
            <span>Page</span>
            <select
              ref={pageSelectRef}
              id={pageSelectId}
              value={page}
              disabled={isFetching}
              onChange={(event) => onPageChange(Number(event.target.value))}
            >
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <option key={pageNumber} value={pageNumber}>Page {pageNumber} of {totalPages}</option>
              ))}
            </select>
          </label>

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
        </div>
      ) : null}
    </nav>
  );
}

function getPageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 3) return [1, 2, 3, "ellipsis", totalPages];
  if (page >= totalPages - 2) return [1, "ellipsis", totalPages - 1, totalPages];
  return [1, "ellipsis", page, "ellipsis", totalPages];
}
