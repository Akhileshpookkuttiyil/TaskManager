import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Search, Plus, Calendar, Settings, FileText, CheckCircle2, Moon, Sun, Bell } from "lucide-react";
import { useTheme } from "../theme/theme-context";

export const CommandPalette = ({ isOpen, onClose, onQuickAdd }) => {
  const navigate = useNavigate();
  const { toggleTheme, theme } = useTheme();
  const { items: tasks } = useSelector((state) => state.tasks);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);



  // Command items definitions
  const commandItems = useMemo(() => {
    const items = [
      // Actions
      { id: "act-create", title: "Create a new task", category: "Actions", icon: Plus, action: () => { onQuickAdd(); onClose(); } },
      { id: "act-theme", title: `Toggle theme (current: ${theme})`, category: "Actions", icon: theme === "dark" ? Sun : Moon, action: () => { toggleTheme(); onClose(); } },
      
      // Page Navigations
      { id: "nav-dash", title: "Go to Dashboard", category: "Navigation", icon: CheckCircle2, action: () => { navigate("/"); onClose(); } },
      { id: "nav-tasks", title: "Go to Tasks Workspace", category: "Navigation", icon: FileText, action: () => { navigate("/tasks"); onClose(); } },
      { id: "nav-cal", title: "Go to Calendar Planner", category: "Navigation", icon: Calendar, action: () => { navigate("/tasks?viewMode=calendar"); onClose(); } },
      { id: "nav-notif", title: "Go to Notifications Center", category: "Navigation", icon: Bell, action: () => { navigate("/notifications"); onClose(); } },
      { id: "nav-sett", title: "Go to Settings", category: "Navigation", icon: Settings, action: () => { navigate("/profile"); onClose(); } },
    ];


    // Add Tasks search
    tasks.slice(0, 15).forEach((task) => {
      items.push({
        id: `task-${task._id}`,
        title: task.title,
        subtitle: task.status,
        category: "Tasks",
        icon: FileText,
        action: () => { navigate(`/tasks?focus=${task._id}`); onClose(); },
      });
    });

    return items;
  }, [tasks, theme, navigate, onQuickAdd, onClose, toggleTheme]);

  // Fuzzy match filtering
  const filteredItems = useMemo(() => {
    if (!query) return commandItems;
    const cleanQuery = query.toLowerCase().trim();
    return commandItems.filter(
      (item) =>
        item.title.toLowerCase().includes(cleanQuery) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(cleanQuery)) ||
        item.category.toLowerCase().includes(cleanQuery)
    );
  }, [query, commandItems]);

  const handleSelect = (item) => {
    if (item.action) {
      item.action();
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    if (isOpen) {
      const frameId = requestAnimationFrame(() => {
        setQuery("");
        setSelectedIndex(0);
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
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150" style={{ boxShadow: "var(--shadow-elevated)" }}>
        {/* Search Input Box */}
        <div className="flex items-center gap-2.5 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <Search size={18} className="text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-white dark:placeholder:text-neutral-500"
          />
          <kbd className="hidden rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={scrollRef}
          className="max-h-80 overflow-y-auto p-1.5"
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-600 dark:text-neutral-300"
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <div className={`flex h-6.5 w-6.5 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 ${isSelected ? "text-neutral-950 dark:text-white" : "text-neutral-400"}`}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-xs text-neutral-400 capitalize">{item.subtitle}</p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                  {item.category}
                </span>
              </button>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No matching commands or results found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
