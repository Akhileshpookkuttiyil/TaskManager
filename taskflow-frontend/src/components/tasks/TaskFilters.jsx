import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useDebounce } from "../../hooks/useDebounce";
import { setFilters } from "../../store/slices/tasksSlice";
import { TASK_PRIORITY, TASK_STATUS } from "../../utils/constants";

const FilterButton = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
      active
        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
    }`}
  >
    {children}
  </button>
);

export const TaskFilters = () => {
  const dispatch = useDispatch();
  const { filters } = useSelector((state) => state.tasks);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    dispatch(setFilters({ search: debouncedSearch }));
  }, [debouncedSearch, dispatch]);

  const handleFilter = (key, value) => {
    dispatch(setFilters({ [key]: filters[key] === value ? "" : value }));
  };

  const clearFilters = () => {
    setSearchInput("");
    dispatch(setFilters({ status: "", priority: "", search: "" }));
  };

  const hasActiveFilters = filters.status || filters.priority || filters.search;

  return (
    <div className="card space-y-4 p-4">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search tasks"
          className="input pl-9"
          aria-label="Search tasks"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Status</span>
          {TASK_STATUS.map((status) => (
            <FilterButton
              key={status.value}
              active={filters.status === status.value}
              onClick={() => handleFilter("status", status.value)}
            >
              {status.label}
            </FilterButton>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Priority</span>
          {TASK_PRIORITY.map((priority) => (
            <FilterButton
              key={priority.value}
              active={filters.priority === priority.value}
              onClick={() => handleFilter("priority", priority.value)}
            >
              {priority.label}
            </FilterButton>
          ))}
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <X size={12} />
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
};
