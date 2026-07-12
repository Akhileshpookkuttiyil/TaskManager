/**
 * FloatingSection — logical grouping of menu items inside a floating surface.
 *
 * Props:
 *   label     — optional section heading text (renders a section-eyebrow label)
 *   className — extra classes
 *   children  — FloatingMenuItems or other content
 */
export const FloatingSection = ({ label, className = "", children }) => (
  <div className={`px-1.5 py-1 ${className}`}>
    {label ? (
      <p className="floating-section-label">{label}</p>
    ) : null}
    {children}
  </div>
);

export default FloatingSection;
