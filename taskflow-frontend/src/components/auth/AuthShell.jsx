import { CheckSquare } from "lucide-react";
import { ThemeToggle } from "../theme/ThemeToggle";

export const AuthShell = ({ eyebrow, title, description, features, children }) => (
  <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <CheckSquare size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-neutral-900 dark:text-white">TaskFlow</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid flex-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_408px]">
        <div className="hidden lg:block">
          <p className="section-eyebrow">{eyebrow}</p>
          <h1 className="mt-4 max-w-md font-serif text-5xl italic leading-[1.1] text-neutral-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-neutral-600 dark:text-neutral-400">{description}</p>

          <ul className="mt-9 space-y-3.5">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="card w-full p-6 sm:p-8">{children}</div>
      </div>
    </div>
  </div>
);
