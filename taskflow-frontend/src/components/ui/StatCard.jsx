import { AnimatedNumber } from "./AnimatedNumber";

export const StatCard = ({ label, value, color = "neutral", suffix = "" }) => {
  const accent = {
    neutral: "text-neutral-400 dark:text-neutral-500",
    blue: "text-brand-600 dark:text-brand-400",
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${accent[color] || accent.neutral}`}>
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
    </div>
  );
};
