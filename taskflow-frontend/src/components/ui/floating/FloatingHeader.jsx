/**
 * FloatingHeader — top section of a floating surface.
 * Typically contains identity/user info, title, or a search input.
 *
 * Props:
 *   className — extra classes
 *   children  — content
 */
export const FloatingHeader = ({ className = "", children }) => (
  <div
    className={`px-3 pb-2 pt-3 ${className}`}
    style={{ borderBottom: "1px solid var(--border-subtle)" }}
  >
    {children}
  </div>
);

export default FloatingHeader;
