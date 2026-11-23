import { Search, Tag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useDebounce } from "../../hooks/useDebounce";
import { setFilters } from "../../store/slices/tasksSlice";
import { TASK_DUE_DATE_FILTERS, TASK_PRIORITY, TASK_STATUS } from "../../utils/constants";
import { useNavigate } from "react-router-dom";

const FilterSelect = ({ label, value, options, onChange, id }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-xs font-medium text-muted">
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
  const navigate = useNavigate();
  const { filters } = useSelector((state) => state.tasks);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    dispatch(setFilters({ search: debouncedSearch }));
  }, [debouncedSearch, dispatch]);

  const updateFilter = (key) => (event) => {
    const val = event.target.value;
    if (key === "view") {
      navigate(`/tasks?view=${val}`);
    } else if (key === "dueDate") {
      dispatch(setFilters({ dueDate: val }));
      const url = new URL(window.location);
      if (val && val !== "all") {
        url.searchParams.set("dueDate", val);
      } else {
        url.searchParams.delete("dueDate");
      }
      navigate(url.pathname + (url.search ? url.search : ""), { replace: true });
    } else {
      dispatch(setFilters({ [key]: val }));
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    dispatch(
      setFilters({
        status: "",
        priority: "",
        dueDate: "",
        search: "",
        tag: "",
      })
    );
    const url = new URL(window.location);
    let changed = false;
    for (const param of ["tag", "label", "dueDate"]) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    }
    if (changed) {
      navigate(url.pathname + (url.search ? url.search : ""), { replace: true });
    }
  };

  const removeTagFilter = () => {
    dispatch(setFilters({ tag: "" }));
    const url = new URL(window.location);
    url.searchParams.delete("tag");
    url.searchParams.delete("label");
    navigate(url.pathname + (url.search ? url.search : ""), { replace: true });
  };

  const hasActiveFilters = Boolean(
    filters.status || filters.priority || filters.dueDate || filters.search || filters.tag
  );

  return (
    <div className="card space-y-4 p-4">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
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

      {filters.tag && (
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-xs text-muted">Active tag:</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-elevated border border-subtle px-2 py-0.5 text-xs font-semibold text-primary">
            <Tag size={11} className="text-muted" />
            <span>#{filters.tag}</span>
            <button
              type="button"
              onClick={removeTagFilter}
              className="ml-0.5 text-muted hover:text-primary transition-colors"
              aria-label="Remove tag filter"
            >
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-primary transition-colors duration-150"
        >
          <X size={12} />
          Clear filters
        </button>
      ) : null}
    </div>
  );
};
