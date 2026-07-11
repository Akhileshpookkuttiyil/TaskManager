import { X, Keyboard } from "lucide-react";

export const ShortcutsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutsList = [
    { keys: ["Ctrl", "K"], description: "Toggle Global Command Palette" },
    { keys: ["Alt", "N"], description: "Quick add a new task" },
    { keys: ["?"], description: "Toggle Keyboard Shortcuts Help" },
    { keys: ["Esc"], description: "Close active dialogs / side drawer" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay Backdrop */}
      <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-[1px] transition-opacity" onClick={onClose} />

      {/* Shortcuts content */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 animate-in zoom-in-95 duration-150" style={{ boxShadow: "var(--shadow-elevated)" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-900">
          <div className="flex items-center gap-2 text-neutral-800 dark:text-white">
            <Keyboard size={16} className="text-neutral-500 dark:text-neutral-400" />
            <h3 className="text-sm font-bold">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost h-7 w-7 p-0 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        {/* Shortcuts table */}
        <div className="mt-4 space-y-3.5">
          {shortcutsList.map((sc, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                {sc.description}
              </span>
              <div className="flex items-center gap-1">
                {sc.keys.map((key, keyIdx) => (
                  <kbd
                    key={keyIdx}
                    className="inline-flex items-center rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-bold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ShortcutsModal;
