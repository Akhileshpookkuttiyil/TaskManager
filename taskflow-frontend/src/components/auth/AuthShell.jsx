import { CheckCircle2, CheckSquare } from "lucide-react";
import { ThemeToggle } from "../theme/ThemeToggle";

export const AuthShell = ({ eyebrow, title, description, features = [], visual, children }) => (
  <div className="min-h-screen bg-app text-primary">
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--text-primary)]">
            <CheckSquare size={16} className="text-[var(--bg-app)]" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-primary">TaskFlow</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid flex-1 items-center gap-7 lg:grid-cols-[minmax(0,1fr)_420px] xl:gap-12">
        <div className="space-y-8">
          <p className="section-eyebrow">{eyebrow}</p>
          <div className="max-w-2xl">
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-primary sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-secondary sm:text-base sm:leading-7">
              {description}
            </p>
          </div>

          {visual ? (
            visual
          ) : (
            <ul className="hidden max-w-lg space-y-3.5 lg:block">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-secondary">
                  <CheckCircle2 size={16} className="mt-1 shrink-0 text-muted" />
                  {feature}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card w-full p-6 sm:p-8">{children}</div>
      </div>
    </div>
  </div>
);
