import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export const Modal = ({ isOpen, onClose, title, children, description }) => {
  const containerRef = useFocusTrap(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-neutral-950/55"
        aria-label="Close dialog backdrop"
        onClick={onClose}
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        tabIndex="-1"
        className="card relative z-10 w-full max-w-lg overflow-hidden focus:outline-none"
        style={{ boxShadow: "var(--shadow-elevated)" }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-neutral-900 dark:text-white">
              {title}
            </h2>
            {description ? (
              <p id="modal-description" className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-ghost h-8 w-8 shrink-0 px-0 text-neutral-400 focus-ring"
            aria-label="Close dialog"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-80px)] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
};
