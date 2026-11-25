import { AnimatedNumber } from "./AnimatedNumber";

export const StatCard = ({ label, value, color = "neutral", suffix = "" }) => {
  const accent = {
    neutral: "text-primary",
    blue: "text-primary",
    green: "text-secondary",
    amber: "text-secondary",
    rose: "text-danger",
  };

  return (
    <div className="card p-4 sm:p-6 flex flex-col justify-between min-h-[104px]">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${accent[color] || accent.neutral}`}>
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
    </div>
  );
};
