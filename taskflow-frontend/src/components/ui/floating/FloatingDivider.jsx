/**
 * FloatingDivider — thin horizontal rule for visual separation inside floating surfaces.
 *
 * Props:
 *   className — extra classes
 */
export const FloatingDivider = ({ className = "" }) => (
  <hr className={`floating-divider ${className}`} aria-hidden="true" />
);

export default FloatingDivider;
