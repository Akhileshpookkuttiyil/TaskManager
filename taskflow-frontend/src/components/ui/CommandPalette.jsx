import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Calendar,
  Settings,
  FileText,
  CheckCircle2,
  Moon,
  Sun,
  Bell,
  Timer,
  Play,
  Pause,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useTheme } from "../theme/theme-context";
import { usePomodoro } from "../../context/pomodoro-context";
import { tasksApi } from "../../api/tasks.api";

export const CommandPalette = ({ isOpen, onClose, onQuickAdd }) => {
  const navigate = useNavigate();
  const { toggleTheme, theme } = useTheme();
  const {
    status: pomodoroStatus,
    mode: pomodoroMode,
    startTimer,
    pauseTimer,
    openModal: openPomodoroModal,
  } = usePomodoro();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const activeRequestIdRef = useRef(0);
  const debounceTimerRef = useRef(null);

  // Focus actions depending on current Pomodoro state
  const focusActions = useMemo(() => {
    const isRunning = pomodoroStatus === "running";
    const isPaused = pomodoroStatus === "paused";
    const actions = [];

    if (isRunning) {
      actions.push({
        id: "pomo-pause",
        title: "Pause focus session",
        subtitle: `Currently in ${pomodoroMode} mode`,
        category: "Focus Timer",
        icon: Pause,
        action: () => {
          pauseTimer();
          onClose();
        },
      });
    } else if (isPaused) {
      actions.push({
        id: "pomo-resume",
        title: "Resume focus session",
        subtitle: `Resume ${pomodoroMode} countdown`,
        category: "Focus Timer",
        icon: Play,
        action: () => {
          startTimer();
          onClose();
        },
      });
    } else {
      actions.push({
        id: "pomo-start",
        title: "Start focus session",
        subtitle: "Begin a 25-minute Pomodoro session",
        category: "Focus Timer",
        icon: Play,
        action: () => {
          startTimer();
          openPomodoroModal();
          onClose();
        },
      });
    }

    actions.push({
      id: "pomo-open",
      title: "Open Focus Timer widget",
      subtitle: "Adjust session durations, sound & active task",
      category: "Focus Timer",
      icon: Timer,
      action: () => {
        openPomodoroModal();
        onClose();
      },
    });

    return actions;
  }, [pomodoroStatus, pomodoroMode, pauseTimer, startTimer, openPomodoroModal, onClose]);

  // Static quick actions & navigations
  const quickActions = useMemo(() => {
    return [
      {
        id: "act-create",
        title: "Create a new task",
        category: "Quick Actions",
        icon: Plus,
        action: () => {
          onQuickAdd();
          onClose();
        },
      },
      {
        id: "act-theme",
        title: `Toggle theme (current: ${theme})`,
        category: "Quick Actions",
        icon: theme === "dark" ? Sun : Moon,
        action: () => {
          toggleTheme();
          onClose();
        },
      },
      {
        id: "nav-dash",
        title: "Go to Dashboard",
        category: "Navigation",
        icon: CheckCircle2,
        action: () => {
          navigate("/");
          onClose();
        },
      },
      {
        id: "nav-tasks",
        title: "Go to Tasks Workspace",
        category: "Navigation",
        icon: FileText,
        action: () => {
          navigate("/tasks");
          onClose();
        },
      },
      {
        id: "nav-cal",
        title: "Go to Calendar Planner",
        category: "Navigation",
        icon: Calendar,
        action: () => {
          navigate("/tasks?viewMode=calendar");
          onClose();
        },
      },
      {
        id: "nav-analytics",
        title: "Go to Productivity Insights",
        category: "Navigation",
        icon: TrendingUp,
        action: () => {
          navigate("/analytics");
          onClose();
        },
      },
      {
        id: "nav-notif",
        title: "Go to Notification Center",
        category: "Navigation",
        icon: Bell,
        action: () => {
          navigate("/notifications");
          onClose();
        },
      },
      {
        id: "nav-sett",
        title: "Go to Workspace Settings",
        category: "Navigation",
        icon: Settings,
        action: () => {
          navigate("/profile");
          onClose();
        },
      },
    ];
  }, [theme, navigate, onQuickAdd, onClose, toggleTheme]);

  // Debounced backend global search with stale-response protection
  const executeSearch = useCallback(
    async (searchTerm) => {
      const cleanTerm = searchTerm.trim();
      if (cleanTerm.length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        setSearchError(null);
        return;
      }

      const requestId = ++activeRequestIdRef.current;
      setSearchLoading(true);
      setSearchError(null);

      try {
        const res = await tasksApi.getAll({ search: cleanTerm, limit: 8 });
        // Stale-response guard: ignore response if superseded by a newer query
        if (requestId !== activeRequestIdRef.current) return;

        const tasks = res.data?.data?.tasks || [];
        setSearchResults(tasks);
      } catch {
        if (requestId !== activeRequestIdRef.current) return;
        setSearchError("Failed to search tasks. Please check your connection.");
        setSearchResults([]);
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setSearchLoading(false);
        }
      }
    },
    []
  );

  // Trigger search on query change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(query);
      }, 250);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, executeSearch]);

  // Filter actions locally based on query
  const matchingActions = useMemo(() => {
    const allActions = [...focusActions, ...quickActions];
    if (!query.trim()) return allActions;
    const cleanQuery = query.toLowerCase().trim();
    return allActions.filter(
      (item) =>
        item.title.toLowerCase().includes(cleanQuery) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(cleanQuery)) ||
        item.category.toLowerCase().includes(cleanQuery)
    );
  }, [query, focusActions, quickActions]);

  // Transform backend task results to palette items
  const taskItems = useMemo(() => {
    return searchResults.map((task) => {
      const tagSnippet = Array.isArray(task.tags) && task.tags.length > 0 ? `#${task.tags.join(" #")}` : "";
      const subtitleParts = [task.status, task.priority, tagSnippet].filter(Boolean);

      return {
        id: `task-${task._id}`,
        title: task.title,
        subtitle: subtitleParts.join(" • "),
        category: "Tasks (Global Search)",
        icon: FileText,
        priority: task.priority,
        status: task.status,
        action: () => {
          navigate(`/tasks?focus=${task._id}`);
          onClose();
        },
      };
    });
  }, [searchResults, navigate, onClose]);

  // Combined item list
  const filteredItems = useMemo(() => {
    return [...matchingActions, ...taskItems];
  }, [matchingActions, taskItems]);

  const handleSelect = (item) => {
    if (item && item.action) {
      item.action();
    }
  };

  // Keyboard shortcut listener and focus reset
  useEffect(() => {
    if (isOpen) {
      const frameId = requestAnimationFrame(() => {
        setQuery("");
        setSelectedIndex(0);
        setSearchResults([]);
        setSearchLoading(false);
        setSearchError(null);
      });

      const timerId = setTimeout(() => inputRef.current?.focus(), 50);

      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timerId);
      };
    }
    return undefined;
  }, [isOpen]);

  // Navigate selection via keys
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(filteredItems.length - 1, prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const activeItem = filteredItems[selectedIndex];
        if (activeItem) {
          handleSelect(activeItem);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Auto-scroll selected element into view
  useEffect(() => {
    const selectedElement = scrollRef.current?.children[selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-neutral-950/60 p-4 pt-12 backdrop-blur-[2px] sm:pt-28">
      {/* Click backdrop to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette and Global Search"
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-neutral bg-surface shadow-elevated animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input Box */}
        <div className="flex items-center gap-2.5 border-b border-subtle px-4 py-3">
          {searchLoading ? (
            <Loader2 size={18} className="animate-spin text-muted shrink-0" />
          ) : (
            <Search size={18} className="text-muted shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search all tasks across database..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
            aria-autocomplete="list"
            aria-controls="command-results-list"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSearchResults([]);
              }}
              className="text-xs text-muted hover:text-primary px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          )}
          <kbd className="hidden rounded bg-elevated border border-neutral px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          id="command-results-list"
          ref={scrollRef}
          className="max-h-96 overflow-y-auto p-1.5 space-y-0.5"
          role="listbox"
          aria-label="Command search list"
        >
          {filteredItems.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                  isSelected ? "bg-hover text-primary" : "text-secondary"
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border border-neutral bg-elevated shrink-0 ${
                    isSelected ? "text-primary" : "text-muted"
                  }`}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate leading-tight">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-xs text-muted truncate mt-0.5 capitalize">{item.subtitle}</p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-bold tracking-wider text-muted uppercase bg-app px-2 py-0.5 rounded border border-subtle">
                  {item.category}
                </span>
              </button>
            );
          })}

          {/* Search Loading Indicator */}
          {searchLoading && searchResults.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted">
              <Loader2 size={15} className="animate-spin" />
              <span>Searching all tasks across database...</span>
            </div>
          )}

          {/* Search Error State */}
          {searchError && (
            <div className="px-4 py-4 text-center text-xs text-red-600 dark:text-red-400">
              {searchError}
            </div>
          )}

          {/* Empty State */}
          {filteredItems.length === 0 && !searchLoading && !searchError && (
            <div className="px-4 py-8 text-center text-sm text-muted space-y-2">
              <p>No commands or tasks found matching &quot;{query}&quot;</p>
              <button
                type="button"
                onClick={() => {
                  onQuickAdd();
                  onClose();
                }}
                className="btn-primary text-xs py-1.5 px-3 mx-auto"
              >
                <Plus size={13} />
                <span>Create new task &quot;{query}&quot;</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between border-t border-subtle px-4 py-2 text-[10px] text-muted bg-elevated">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-semibold text-primary">↑↓</kbd> to navigate
            </span>
            <span>
              <kbd className="font-semibold text-primary">↵</kbd> to select
            </span>
            <span>
              <kbd className="font-semibold text-primary">esc</kbd> to close
            </span>
          </div>
          <span>Global Search enabled</span>
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
