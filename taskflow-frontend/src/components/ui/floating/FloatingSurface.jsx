import { forwardRef } from "react";

/**
 * FloatingSurface — the elevated card container shared by all floating overlays.
 *
 * Usage:
 *   <FloatingSurface isOpen={open} className="w-64">
 *     {children}
 *   </FloatingSurface>
 *
 * Props:
 *   isOpen     — controls visibility + animation class
 *   className  — additional classes (width, position, etc.)
 *   style      — inline overrides
 *   children   — content
 *   ...rest    — forwarded to the root div (role, aria-*, id, etc.)
 */
export const FloatingSurface = forwardRef(function FloatingSurface(
  { isOpen, className = "", style, children, ...rest },
  ref
) {
  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={`floating-surface floating-enter ${className}`}
      style={{
        // Ensure it never clips against viewport edges.
        maxHeight: "calc(100dvh - 5rem)",
        overflowY: "auto",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

export default FloatingSurface;
