import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  Eye,
  EyeOff,
  ListChecks,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AuthShell } from "../components/auth/AuthShell";
import { FieldError } from "../components/ui/shared";
import { Spinner } from "../components/ui/Spinner";
import { clearError, loginUser } from "../store/slices/authSlice";

const DEMO_EMAIL = "akhilesh@gmail.com";
const DEMO_PASSWORD = "password";

export const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, token } = useSelector((s) => s.auth);

  const [form, setForm] = useState({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (token) navigate("/", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.email.trim() && !form.password) {
      return true;
    }

    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!form.password) nextErrors.password = "Password is required.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const signIn = async (email = DEMO_EMAIL, password = DEMO_PASSWORD) => {
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      toast.success("Welcome back.");
      navigate("/");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      toast.error("Please complete the required fields.");
      return;
    }

    await signIn(form.email.trim() || DEMO_EMAIL, form.password || DEMO_PASSWORD);
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Step into a workspace that already knows what matters."
      description="TaskFlow brings your daily queue, schedule, and progress signals into one calm control surface so you can start moving immediately."
      features={[
        "See your priority mix instantly from the dashboard.",
        "Capture tasks quickly and refine them later without losing context.",
        "Stay aligned across devices with a calmer, more deliberate workflow.",
      ]}
      visual={<LoginWorkspacePreview />}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">Sign in</h2>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            Use your account or jump into the demo workspace.
          </p>
        </div>
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 sm:flex">
          <ShieldCheck size={18} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label htmlFor="login-email" className="label">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={`input ${errors.email ? "input-error" : ""}`}
            autoComplete="email"
          />
          <FieldError message={errors.email} />
        </div>

        <div>
          <label htmlFor="login-password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className={`input pr-11 ${errors.password ? "input-error" : ""}`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <FieldError message={errors.password} />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner size="sm" /> : <LogIn size={16} />}
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-neutral-900 transition-colors hover:text-neutral-600 dark:text-white dark:hover:text-neutral-300">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
};

const previewTasks = [
  { title: "Review launch checklist", meta: "Today, 10:30 AM", priority: "High" },
  { title: "Sync design feedback", meta: "Today, 2:00 PM", priority: "Medium" },
  { title: "Archive completed tasks", meta: "Tomorrow", priority: "Low" },
];

const LoginWorkspacePreview = () => (
  <div className="hidden lg:block">
    <div className="max-w-2xl rounded-xl border border-neutral-200 bg-white p-4 shadow-[var(--shadow-subtle)] dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Today&apos;s command center</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">Dashboard snapshot</h3>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
          <ListChecks size={18} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          ["24", "Total"],
          ["8", "Due today"],
          ["82%", "Score"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/70">
            <p className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">{value}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_220px]">
        <div className="rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Focus queue</p>
            <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              Live
            </span>
          </div>

          <div className="space-y-2">
            {previewTasks.map((task, index) => (
              <div key={task.title} className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900/80">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400">
                  {index === 0 ? <CircleDot size={15} /> : <CheckCircle2 size={15} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{task.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                    <Clock3 size={11} />
                    {task.meta}
                  </p>
                </div>
                <span className="rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-neutral-500 dark:text-neutral-400" />
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Weekly goal</p>
          </div>
          <div className="mt-5 flex items-end gap-1.5">
            {[44, 62, 38, 78, 58, 86, 70].map((height, index) => (
              <div key={index} className="flex flex-1 items-end rounded-full bg-neutral-100 dark:bg-neutral-800" style={{ height: 86 }}>
                <div className="w-full rounded-full bg-neutral-950 dark:bg-white" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              <span>Completion rate</span>
              <span>82%</span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-1.5 w-[82%] rounded-full bg-neutral-950 dark:bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
