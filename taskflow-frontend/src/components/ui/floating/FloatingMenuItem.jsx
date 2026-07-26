import { forwardRef, memo } from "react";

/**
 * FloatingMenuItem — individual interactive row inside a floating surface.
 *
 * Props:
 *   icon      — Lucide icon component
 *   label     — primary text label
 *   shortcut  — optional keyboard shortcut string(s), e.g. "⌘K" or ["Ctrl", "K"]
 *   danger    — applies danger color / hover treatment
 *   disabled  — prevents interaction and dims the item
 *   onClick   — click handler
 *   className — extra classes
 *   ...rest   — forwarded (role, aria-*, data-*, etc.)
 */
export const FloatingMenuItem = memo(
  forwardRef(function FloatingMenuItem(
    {
      icon: Icon,
      label,
      shortcut,
      danger = false,
      disabled = false,
      onClick,
      className = "",
      ...rest
    },
    ref
  ) {
    const baseClass = danger ? "floating-item floating-item-danger" : "floating-item";
    const disabledClass = disabled ? "pointer-events-none opacity-45" : "";

    // Normalize shortcut to array for rendering multi-key combos
    const keys = shortcut
      ? Array.isArray(shortcut)
        ? shortcut
        : [shortcut]
      : null;

    return (
      <button
        ref={ref}
        type="button"
        role="menuitem"
        disabled={disabled}
        onClick={disabled ? undefined : onClick}
        className={`${baseClass} ${disabledClass} ${className}`}
        {...rest}
      >
        {/* Icon */}
        {Icon ? (
          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center">
            <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
          </span>
        ) : null}

        {/* Label */}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>

        {/* Keyboard shortcut badge */}
        {keys ? (
          <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
            {keys.map((k, i) => (
              <kbd
                key={i}
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-pressed text-muted border border-neutral"
              >
                {k}
              </kbd>
            ))}
          </span>
        ) : null}
      </button>
    );
  })
);

export default FloatingMenuItem;
