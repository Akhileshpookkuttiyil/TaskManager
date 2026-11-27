import { useState, useEffect, useCallback, useRef } from "react";
import {
  Link2,
  Lock,
  Unlock,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Check,
  Search,
  ArrowRight,
  ChevronDown,
  X,
} from "lucide-react";
import { tasksApi } from "../../api/tasks.api";
import toast from "react-hot-toast";

export const TaskDependencies = ({
  taskId,
  allTasks = [],
  onDependenciesChanged,
}) => {
  const [dependencies, setDependencies] = useState([]);
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(Boolean(taskId));
  const [error, setError] = useState(null);

  // Synchronize state during render when taskId prop changes
  const [prevTaskId, setPrevTaskId] = useState(taskId);
  if (taskId !== prevTaskId) {
    setPrevTaskId(taskId);
    setDependencies([]);
    setDependents([]);
    setLoading(Boolean(taskId));
    setError(null);
  }

  // Add prerequisite search/select state
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrereqId, setSelectedPrereqId] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState("prerequisites"); // "prerequisites" | "dependents"

  const activeRequestIdRef = useRef(0);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsSelectOpen(false);
      }
    };
    if (isSelectOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSelectOpen]);

  // Fetch dependencies and dependents on user action (refresh, retry, post-mutation)
  const fetchDependencyData = useCallback(async (id = taskId) => {
    if (!id) {
      setDependencies([]);
      setDependents([]);
      setLoading(false);
      setError(null);
      return;
    }

    const currentReqId = ++activeRequestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const [depsRes, dependentsRes] = await Promise.all([
        tasksApi.getDependencies(id),
        tasksApi.getDependents(id),
      ]);

      if (currentReqId === activeRequestIdRef.current) {
        const fetchedDeps = depsRes.data?.data?.dependencies || [];
        const fetchedDependents = dependentsRes.data?.data?.dependents || [];
        setDependencies(fetchedDeps);
        setDependents(fetchedDependents);
        setLoading(false);

        const incompletePrereqs = fetchedDeps.filter(
          (d) => d.prerequisite && d.prerequisite.status !== "completed"
        );
        const isBlocked = incompletePrereqs.length > 0;

        if (onDependenciesChanged) {
          onDependenciesChanged({
            taskId: id,
            dependencies: fetchedDeps,
            dependents: fetchedDependents,
            isBlocked,
            incompletePrerequisites: incompletePrereqs,
          });
        }
      }
    } catch (err) {
      if (currentReqId === activeRequestIdRef.current) {
        setError(err.response?.data?.message || "Failed to load task dependencies.");
        setLoading(false);
      }
    }
  }, [taskId, onDependenciesChanged]);

  // Asynchronous dependency synchronization effect complying with React hooks purity rules
  useEffect(() => {
    let ignore = false;

    if (!taskId) {
      return;
    }

    const currentReqId = ++activeRequestIdRef.current;

    const loadData = async () => {
      try {
        const [depsRes, dependentsRes] = await Promise.all([
          tasksApi.getDependencies(taskId),
          tasksApi.getDependents(taskId),
        ]);

        if (!ignore && currentReqId === activeRequestIdRef.current) {
          const fetchedDeps = depsRes.data?.data?.dependencies || [];
          const fetchedDependents = dependentsRes.data?.data?.dependents || [];
          setDependencies(fetchedDeps);
          setDependents(fetchedDependents);
          setLoading(false);

          const incompletePrereqs = fetchedDeps.filter(
            (d) => d.prerequisite && d.prerequisite.status !== "completed"
          );
          const isBlocked = incompletePrereqs.length > 0;

          if (onDependenciesChanged) {
            onDependenciesChanged({
              taskId,
              dependencies: fetchedDeps,
              dependents: fetchedDependents,
              isBlocked,
              incompletePrerequisites: incompletePrereqs,
            });
          }
        }
      } catch (err) {
        if (!ignore && currentReqId === activeRequestIdRef.current) {
          setError(err.response?.data?.message || "Failed to load task dependencies.");
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [taskId, onDependenciesChanged]);

  // Candidate tasks for prerequisite selection:
  // Must NOT be the current task
  // Must NOT already be a prerequisite
  const existingPrerequisiteIds = new Set(
    dependencies.map((d) => d.prerequisiteId || d.prerequisite?._id || d.prerequisite?.id)
  );

  const candidateTasks = allTasks.filter((t) => {
    if (!t || t._id === taskId || t.id === taskId) return false;
    if (existingPrerequisiteIds.has(t._id || t.id)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (t.title || "").toLowerCase().includes(q);
    const tagMatch = Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(q));
    return titleMatch || tagMatch;
  });

  // Handle adding prerequisite
  const handleAddPrerequisite = async (prereqIdToAdd) => {
    const targetPrereqId = prereqIdToAdd || selectedPrereqId;
    if (!taskId || !targetPrereqId || adding) return;

    setAdding(true);
    try {
      const res = await tasksApi.addDependency(taskId, targetPrereqId);
      const newDep = res.data?.data?.dependency;
      if (newDep) {
        setDependencies((prev) => [...prev, newDep]);
      }
      setSelectedPrereqId("");
      setSearchQuery("");
      setIsSelectOpen(false);
      toast.success("Prerequisite added.");
      await fetchDependencyData(taskId);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to add prerequisite.";
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  // Handle removing prerequisite
  const handleRemovePrerequisite = async (dep) => {
    if (!taskId) return;
    const targetId = dep.prerequisiteId || dep._id || dep.id;
    setDeletingId(targetId);
    try {
      await tasksApi.removeDependency(taskId, targetId);
      setDependencies((prev) => prev.filter((d) => (d.prerequisiteId || d._id || d.id) !== targetId));
      toast.success("Prerequisite removed.");
      await fetchDependencyData(taskId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove prerequisite.");
    } finally {
      setDeletingId(null);
    }
  };

  const incompletePrerequisites = dependencies.filter(
    (d) => d.prerequisite && d.prerequisite.status !== "completed"
  );
  const isBlocked = incompletePrerequisites.length > 0;
  const allPrerequisitesComplete = dependencies.length > 0 && incompletePrerequisites.length === 0;

  return (
    <div className="space-y-3 pt-3 border-t border-subtle">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Link2 size={14} />
            <span>Task Dependencies</span>
          </h4>
          {dependencies.length > 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                isBlocked
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
                  : "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300"
              }`}
            >
              {isBlocked ? <Lock size={10} /> : <Unlock size={10} />}
              <span>{isBlocked ? `${incompletePrerequisites.length} blocking` : "All clear"}</span>
            </span>
          )}
        </div>

        {taskId && (
          <button
            type="button"
            onClick={() => fetchDependencyData(taskId)}
            disabled={loading}
            className="btn-ghost h-6 w-6 p-0 text-muted hover:text-primary rounded"
            title="Refresh dependencies"
            aria-label="Refresh dependencies"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      {/* Blocked or Clear Banner */}
      {isBlocked && (
        <div
          data-testid="blocked-warning-banner"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Cannot complete: Task is blocked by {incompletePrerequisites.length} prerequisite{incompletePrerequisites.length > 1 ? "s" : ""}</span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-300 pl-5">
            The following tasks must be completed first:
          </p>
          <ul className="list-disc list-inside text-[11px] pl-5 space-y-0.5 font-medium">
            {incompletePrerequisites.map((p) => (
              <li key={p.id || p._id || p.prerequisiteId}>
                <span className="font-semibold">{p.prerequisite?.title || "Untitled Task"}</span>{" "}
                <span className="opacity-75">({p.prerequisite?.status || "pending"})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {allPrerequisitesComplete && (
        <div
          data-testid="all-prerequisites-complete-banner"
          className="rounded-lg border border-green-500/30 bg-green-500/10 p-2.5 text-xs text-green-800 dark:text-green-200 flex items-center gap-2"
        >
          <Check size={14} className="shrink-0 text-green-600 dark:text-green-400 font-bold" />
          <span>All prerequisites are complete. This task is ready to be marked completed.</span>
        </div>
      )}

      {/* Tabs: Prerequisites vs Dependents */}
      <div className="flex items-center gap-2 border-b border-subtle pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("prerequisites")}
          className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${
            activeTab === "prerequisites"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-secondary"
          }`}
        >
          Prerequisites ({dependencies.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("dependents")}
          className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${
            activeTab === "dependents"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-secondary"
          }`}
        >
          Dependents ({dependents.length})
        </button>
      </div>

      {/* PREREQUISITES VIEW */}
      {activeTab === "prerequisites" && (
        <div className="space-y-2.5">
          {/* Add Prerequisite Search / Dropdown */}
          <div ref={dropdownRef} className="relative">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSelectOpen((prev) => !prev)}
                className="flex-1 bg-hover border border-subtle rounded-md px-3 py-1.5 text-xs text-left text-muted hover:text-primary flex items-center justify-between"
                aria-expanded={isSelectOpen}
                aria-haspopup="listbox"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Plus size={13} />
                  <span>Add prerequisite task...</span>
                </span>
                <ChevronDown size={13} className={`transition-transform ${isSelectOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Dropdown Menu with Search */}
            {isSelectOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-elevated border border-strong rounded-lg shadow-xl z-30 p-2 space-y-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-muted" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-hover border border-subtle rounded-md pl-8 pr-7 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-strong"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-2 text-muted hover:text-primary"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1" role="listbox">
                  {candidateTasks.length === 0 ? (
                    <p className="text-center py-3 text-xs text-muted italic">
                      {searchQuery ? "No matching tasks found." : "No available tasks to add."}
                    </p>
                  ) : (
                    candidateTasks.slice(0, 15).map((t) => {
                      const isComplete = t.status === "completed";
                      return (
                        <button
                          key={t._id || t.id}
                          type="button"
                          onClick={() => handleAddPrerequisite(t._id || t.id)}
                          disabled={adding}
                          className="w-full text-left p-2 rounded-md hover:bg-hover text-xs flex items-center justify-between gap-2 group transition-colors"
                          role="option"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                isComplete ? "bg-green-500" : "bg-neutral-400"
                              }`}
                            />
                            <span className={`truncate font-medium ${isComplete ? "line-through text-muted" : "text-primary"}`}>
                              {t.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted uppercase font-semibold shrink-0">
                            {t.status || "pending"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-4 text-xs text-muted">
              <Loader2 size={15} className="animate-spin mr-2" />
              <span>Loading prerequisites...</span>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <AlertCircle size={13} className="shrink-0" />
                <span className="truncate">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchDependencyData(taskId)}
                className="btn-ghost h-6 px-2 text-[10px] font-semibold text-primary hover:underline shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && dependencies.length === 0 && (
            <p className="text-muted text-center py-3 text-xs italic">
              No prerequisites yet. Add tasks that must be finished before this task can be completed.
            </p>
          )}

          {/* Populated Prerequisites List */}
          {!loading && !error && dependencies.length > 0 && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {dependencies.map((dep) => {
                const prereq = dep.prerequisite;
                const isComplete = prereq?.status === "completed";
                const depId = dep.prerequisiteId || dep._id || dep.id;
                const isDeleting = deletingId === depId;

                return (
                  <div
                    key={dep.id || dep._id || dep.prerequisiteId}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-hover/50 border border-subtle hover:border-neutral transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          isComplete
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                        title={isComplete ? "Prerequisite complete" : "Prerequisite incomplete"}
                      >
                        {isComplete ? <Check size={10} strokeWidth={3} /> : <Lock size={9} />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <span className={`text-xs font-medium block truncate ${isComplete ? "text-muted line-through" : "text-primary"}`}>
                          {prereq?.title || "Untitled Task"}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          isComplete
                            ? "bg-green-500/10 text-green-700 dark:text-green-300"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {prereq?.status || "pending"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePrerequisite(dep)}
                      disabled={isDeleting}
                      className="btn-ghost h-6 w-6 p-0 text-muted hover:text-red-600 dark:hover:text-red-400 opacity-60 group-hover:opacity-100 transition-opacity rounded"
                      title="Remove prerequisite"
                      aria-label={`Remove prerequisite ${prereq?.title || "task"}`}
                    >
                      {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DEPENDENTS VIEW */}
      {activeTab === "dependents" && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-4 text-xs text-muted">
              <Loader2 size={15} className="animate-spin mr-2" />
              <span>Loading dependents...</span>
            </div>
          ) : dependents.length === 0 ? (
            <p className="text-muted text-center py-3 text-xs italic">
              No other tasks depend on this task.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {dependents.map((dep) => {
                const dependentTask = dep.task;
                return (
                  <div
                    key={dep.id || dep._id || dep.taskId}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-hover/40 border border-subtle text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ArrowRight size={12} className="text-muted shrink-0" />
                      <span className="font-medium text-primary truncate">
                        {dependentTask?.title || "Untitled Task"}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-muted uppercase">
                      {dependentTask?.status || "pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskDependencies;
