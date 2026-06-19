import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDispatch } from "react-redux";
import { setPage } from "../../store/slices/tasksSlice";

export const Pagination = ({ pagination }) => {
  const dispatch = useDispatch();

  if (!pagination || pagination.pages <= 1) return null;

  const { page, pages, total } = pagination;

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {total} {total === 1 ? "task" : "tasks"} &middot; page {page} of {pages}
      </p>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => dispatch(setPage(page - 1))}
          disabled={page <= 1}
          className="btn-secondary h-8 w-8 px-0 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => dispatch(setPage(page + 1))}
          disabled={page >= pages}
          className="btn-secondary h-8 w-8 px-0 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
