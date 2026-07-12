/**
 * UserMenu — Premium user profile dropdown for TaskFlow.
 *
 * Architecture:
 *   UserMenu (main shell — state, ARIA, keyboard nav, focus trap)
 *     └─ UserMenuHeader   (avatar + initials fallback + online dot)
 *     └─ UserMenuSection  (grouped actions with optional label)
 *     └─ UserMenuItem     (icon + label + shortcut)
 *     └─ UserMenuDivider  (thin horizontal separator)
 *     └─ UserMenuThemeSwitcher (3-way segmented: Light / Dark / System)
 *
 * All visual primitives are composed from the shared floating surface system
 * (components/ui/floating), ensuring consistency with future popovers,
 * context menus, and notification dropdowns.
 */

import {
  Keyboard,
  LogOut,
  Moon,
  Monitor,
  Sun,
  UserRound,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../../store/slices/authSlice";
import { useTheme } from "../theme/theme-context";
import {
  FloatingDivider,
  FloatingFooter,
  FloatingHeader,
  FloatingMenuItem,
  FloatingSection,
  FloatingSurface,
} from "../ui/floating";

// ─── Avatar ─────────────────────────────────────────────────────────────────

/**
 * Generates 2-letter initials from a full name string.
 * Falls back to single letter, then "U" if no name is available.
 */
const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * UserMenuAvatar — avatar circle with image, initials fallback, and online dot.
 */
const UserMenuAvatar = memo(function UserMenuAvatar({
  src,
  name,
  size = "lg", // "sm" | "lg"
  showOnlineDot = false,
}) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);
  const isLarge = size === "lg";
  const dims = isLarge ? "h-11 w-11" : "h-7 w-7";
  const textSize = isLarge ? "text-base" : "text-xs";

  return (
    <div className={`relative shrink-0 ${dims}`}>
      {src && !imgError ? (
        <img
          src={src}
          alt={name ?? "User avatar"}
          onError={() => setImgError(true)}
          className={`${dims} rounded-full object-cover`}
          style={{ border: "1.5px solid var(--border-neutral)" }}
        />
      ) : (
        <div
          className={`${dims} ${textSize} flex items-center justify-center rounded-full font-semibold select-none`}
          style={{
            background: "var(--bg-pressed)",
            color: "var(--text-primary)",
            border: "1.5px solid var(--border-neutral)",
          }}
          aria-hidden="true"
        >
          {initials}
        </div>
      )}

      {/* Online indicator dot */}
      {showOnlineDot && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2"
          style={{
            background: "var(--success)",
            ringColor: "var(--bg-elevated)",
          }}
        />
      )}
    </div>
  );
});

// ─── Header ──────────────────────────────────────────────────────────────────

/**
 * UserMenuHeader — shows the authenticated user's avatar, name, and email.
 * Strictly no fake metadata (no roles, no workspace names).
 */
const UserMenuHeader = memo(function UserMenuHeader({ user }) {
  return (
    <FloatingHeader>
      <div className="flex items-center gap-3 py-0.5">
        <UserMenuAvatar src={user?.avatar} name={user?.name} size="lg" />
        <div className="min-w-0">
          {user?.name && (
            <p
              className="truncate text-sm font-semibold leading-snug"
              style={{ color: "var(--text-primary)" }}
              title={user.name}
            >
              {user.name}
            </p>
          )}
          {user?.email && (
            <p
              className="truncate text-xs leading-snug"
              style={{ color: "var(--text-muted)" }}
              title={user.email}
            >
              {user.email}
            </p>
          )}
        </div>
      </div>
    </FloatingHeader>
  );
});

// ─── Divider ──────────────────────────────────────────────────────────────────

/**
 * UserMenuDivider — thin separator between menu sections.
 */
export const UserMenuDivider = () => <FloatingDivider />;

// ─── Theme Switcher ──────────────────────────────────────────────────────────

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * UserMenuThemeSwitcher — inline 3-way segmented theme selector.
 * Immediately applies the chosen theme via the ThemeContext.
 */
const UserMenuThemeSwitcher = memo(function UserMenuThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-2.5 py-2">
      <p className="floating-section-label mb-2">Appearance</p>
      <div
        className="flex rounded-lg p-0.5"
        role="radiogroup"
        aria-label="Theme selection"
        style={{
          background: "var(--bg-app)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(value)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-all duration-150 focus-visible:outline-none"
              style={
                isActive
                  ? {
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      boxShadow: "var(--shadow-subtle)",
                      border: "1px solid var(--border-neutral)",
                    }
                  : {
                      color: "var(--text-muted)",
                      border: "1px solid transparent",
                    }
              }
              aria-label={`${label} theme`}
            >
              <Icon size={12} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ─── Main UserMenu ────────────────────────────────────────────────────────────

/**
 * UserMenu — composed from floating surface primitives.
 *
 * Props:
 *   isOpen          — boolean controlling visibility
 *   onClose         — callback to close the menu
 *   onOpenShortcuts — callback to open the global shortcuts modal
 *   triggerRef      — ref to the trigger button for focus restoration on close
 *   id              — id for aria-controls on the trigger button
 */
export const UserMenu = memo(function UserMenu({
  isOpen,
  onClose,
  onOpenShortcuts,
  triggerRef,
  id = "user-menu",
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  // ─ Focus management ──────────────────────────────────────────────────────

  /**
   * Focus the first menu item when the menu opens.
   * Returns focus to the trigger button when it closes.
   */
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => {
        itemRefs.current[0]?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
    // Restore focus to trigger on close
    triggerRef?.current?.focus();
    return undefined;
  }, [isOpen, triggerRef]);

  // ─ Outside click ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        // Also exclude the trigger button itself (handled by toggle)
        if (triggerRef?.current?.contains(e.target)) return;
        onClose();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, [isOpen, onClose, triggerRef]);

  // ─ Keyboard navigation ───────────────────────────────────────────────────

  const getFocusableItems = useCallback(() => {
    if (!menuRef.current) return [];
    return Array.from(
      menuRef.current.querySelectorAll(
        '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])'
      )
    );
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      const items = getFocusableItems();
      const current = document.activeElement;
      const idx = items.indexOf(current);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          items[(idx + 1) % items.length]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length]?.focus();
          break;
        case "Home":
          e.preventDefault();
          items[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
        case "Tab":
          // Allow natural tab order but close the menu when focus leaves
          onClose();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, onClose, getFocusableItems]);

  // ─ Actions ───────────────────────────────────────────────────────────────

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose]
  );

  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate("/login");
    onClose();
  }, [dispatch, navigate, onClose]);

  const handleShortcuts = useCallback(() => {
    onOpenShortcuts?.();
    onClose();
  }, [onOpenShortcuts, onClose]);

  // ─ Menu item definitions (stable across renders) ──────────────────────────

  const menuItems = useMemo(
    () => [
      {
        id: "menu-profile",
        icon: UserRound,
        label: "Profile & Settings",
        onClick: () => handleNavigate("/profile"),
      },
      {
        id: "menu-shortcuts",
        icon: Keyboard,
        label: "Keyboard Shortcuts",
        shortcut: ["?"],
        onClick: handleShortcuts,
      },
    ],
    [handleNavigate, handleShortcuts]
  );

  // ─ Render ─────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <FloatingSurface
      ref={menuRef}
      isOpen={isOpen}
      id={id}
      role="menu"
      aria-label="User account options"
      className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden"
      style={{ overflowY: "visible" }}
    >
      {/* ── Identity header ─────────────────────────────────────── */}
      <UserMenuHeader user={user} />

      {/* ── Appearance (inline theme switcher) ──────────────────── */}
      <UserMenuThemeSwitcher />

      {/* ── Actions ─────────────────────────────────────────────── */}
      <FloatingDivider />
      <FloatingSection>
        {menuItems.map(({ id, icon, label, shortcut, onClick }) => (
          <FloatingMenuItem
            key={id}
            id={id}
            icon={icon}
            label={label}
            shortcut={shortcut}
            onClick={onClick}
          />
        ))}
      </FloatingSection>

      {/* ── Sign out ─────────────────────────────────────────────── */}
      <FloatingFooter>
        <FloatingMenuItem
          id="menu-logout"
          icon={LogOut}
          label="Sign out"
          danger
          onClick={handleLogout}
        />
      </FloatingFooter>
    </FloatingSurface>
  );
});

export default UserMenu;
