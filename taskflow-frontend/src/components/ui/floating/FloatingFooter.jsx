/**
 * FloatingFooter — bottom section of a floating surface.
 * Typically contains utility actions, version info, or legal links.
 *
 * Props:
 *   className — extra classes
 *   children  — content
 */
export const FloatingFooter = ({ className = "", children }) => (
  <div
    className={`px-3 pb-3 pt-2 ${className}`}
    style={{ borderTop: "1px solid var(--border-subtle)" }}
  >
    {children}
  </div>
);

export default FloatingFooter;
