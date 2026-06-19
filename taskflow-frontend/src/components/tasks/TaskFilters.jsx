import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useDebounce } from "../../hooks/useDebounce";
import { setFilters } from "../../store/slices/tasksSlice";
import { TASK_DUE_DATE_FILTERS, TASK_PRIORITY, TASK_STATUS } from "../../utils/constants";

const FilterSelect = ({ label, value, options, onChange, id }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
      {label}
    </label>
    <select id={id} value={value} onChange={onChange} className="input h-10">
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

export const TaskFilters = () => {
  const dispatch = useDispatch();
  const { filters } = useSelector((state) => state.tasks);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    dispatch(setFilters({ search: debouncedSearch }));
  }, [debouncedSearch, dispatch]);

  const updateFilter = (key) => (event) => {
    dispatch(setFilters({ [key]: event.target.value }));
  };

  const clearFilters = () => {
    setSearchInput("");
    dispatch(
      setFilters({
        status: "",
        priority: "",
        dueDate: "",
        search: "",
        view: "all",
      })
    );
  };

  const hasActiveFilters = filters.status || filters.priority || filters.dueDate || filters.search || filters.view !== "all";

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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FilterSelect
          id="task-status-filter"
          label="Status"
          value={filters.status}
          onChange={updateFilter("status")}
          options={[{ value: "", label: "All statuses" }, ...TASK_STATUS]}
        />
        <FilterSelect
          id="task-priority-filter"
          label="Priority"
          value={filters.priority}
          onChange={updateFilter("priority")}
          options={[{ value: "", label: "All priorities" }, ...TASK_PRIORITY]}
        />
        <FilterSelect
          id="task-due-date-filter"
          label="Due date"
          value={filters.dueDate}
          onChange={updateFilter("dueDate")}
          options={TASK_DUE_DATE_FILTERS}
        />
        <FilterSelect
          id="task-view-filter"
          label="View"
          value={filters.view}
          onChange={updateFilter("view")}
          options={[
            { value: "all", label: "All Tasks" },
            { value: "my_day", label: "My Day" },
            { value: "upcoming", label: "Upcoming" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archived" },
          ]}
        />
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
  );
};
