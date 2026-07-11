import { AnimatedNumber } from "./AnimatedNumber";

export const StatCard = ({ label, value, color = "neutral", suffix = "" }) => {
  const accent = {
    neutral: "text-neutral-900 dark:text-white",
    blue: "text-neutral-900 dark:text-white",
    green: "text-neutral-700 dark:text-neutral-200",
    amber: "text-neutral-700 dark:text-neutral-200",
    rose: "text-red-700 dark:text-red-300",
  };

  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${accent[color] || accent.neutral}`}>
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
    </div>
  );
};
