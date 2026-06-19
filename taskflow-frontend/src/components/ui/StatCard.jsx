export const StatCard = ({ label, value, color = "neutral" }) => {
  const accent = {
    neutral: "text-neutral-400 dark:text-neutral-500",
    blue: "text-brand-600 dark:text-brand-400",
    green: "text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className="card p-5">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${accent[color] || accent.neutral}`}>
        {value ?? 0}
      </p>
    </div>
  );
};
