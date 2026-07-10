import { useEffect, useState } from "react";

/**
 * AnimatedNumber counts up to a target value smoothly.
 * Respects prefers-reduced-motion media query by rendering static value immediately.
 */
export const AnimatedNumber = ({ value, duration = 800, prefix = "", suffix = "" }) => {
  const target = Number(value) || 0;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      const frameId = requestAnimationFrame(() => setCurrent(target));
      return () => cancelAnimationFrame(frameId);
    }

    let startTimestamp = null;
    const startValue = 0;

    let animFrameId = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function: easeOutQuad
      const easedProgress = progress * (2 - progress);
      
      const currentVal = Math.round(startValue + easedProgress * (target - startValue));
      setCurrent(currentVal);

      if (progress < 1) {
        animFrameId = window.requestAnimationFrame(step);
      }
    };

    animFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animFrameId) {
        window.cancelAnimationFrame(animFrameId);
      }
    };
  }, [target, duration]);

  return (
    <span aria-live="polite" className="tabular-nums">
      {prefix}
      {current}
      {suffix}
    </span>
  );
};
