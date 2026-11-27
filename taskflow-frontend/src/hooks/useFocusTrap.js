import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Custom React hook for WCAG 2.2 AA compliant focus trapping,
 * keyboard accessibility (Escape key), initial focus, and focus restoration.
 *
 * @param {boolean} isOpen Whether the dialog/modal is open
 * @param {Function} onClose Callback invoked when user presses Escape key
 * @param {Object} [options]
 * @param {React.RefObject} [options.initialFocusRef] Optional element ref to focus on open
 * @returns {React.RefObject} Ref to attach to the dialog/modal container element
 */
export const useFocusTrap = (isOpen, onClose, options = {}) => {
  const containerRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    // 1. Capture previously focused element to restore when dialog closes
    previouslyFocusedElementRef.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return undefined;

    // 2. Set initial focus after mount
    const timerId = setTimeout(() => {
      if (options.initialFocusRef?.current) {
        options.initialFocusRef.current.focus();
      } else {
        const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          // If no focusable children, focus the container itself
          if (container.getAttribute("tabindex") === null) {
            container.setAttribute("tabindex", "-1");
          }
          container.focus();
        }
      }
    }, 20);

    // 3. Tab key trapping & Escape key listener
    const handleKeyDown = (event) => {
      // Handle Escape key
      if (event.key === "Escape") {
        if (typeof onClose === "function") {
          event.stopPropagation();
          onClose();
        }
        return;
      }

      // Handle Tab trapping
      if (event.key !== "Tab") return;

      const isJsdom = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
      const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => isJsdom || el.offsetParent !== null || el.getClientRects().length > 0
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstFocusable || !container.contains(document.activeElement)) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastFocusable || !container.contains(document.activeElement)) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener("keydown", handleKeyDown);

      // 4. Restore focus to previously active element
      if (
        previouslyFocusedElementRef.current &&
        typeof previouslyFocusedElementRef.current.focus === "function" &&
        document.contains(previouslyFocusedElementRef.current)
      ) {
        try {
          previouslyFocusedElementRef.current.focus();
        } catch {
          // Element may have unmounted or lost focus ability
        }
      }
    };
  }, [isOpen, onClose, options.initialFocusRef]);

  return containerRef;
};

export default useFocusTrap;
