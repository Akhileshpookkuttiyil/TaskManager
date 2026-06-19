import { Eye, EyeOff, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AuthShell } from "../components/auth/AuthShell";
import { FieldError } from "../components/ui/shared";
import { Spinner } from "../components/ui/Spinner";
import { clearError, loginUser } from "../store/slices/authSlice";

export const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, token } = useSelector((s) => s.auth);

  const [form, setForm] = useState({ email: "", password: "" });
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

    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!form.password) nextErrors.password = "Password is required.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      toast.error("Please complete the required fields.");
      return;
    }

    const result = await dispatch(loginUser({ email: form.email.trim(), password: form.password }));
    if (loginUser.fulfilled.match(result)) {
      toast.success("Welcome back.");
      navigate("/");
    }
  };

  return (
    <AuthShell
      eyebrow="Focused productivity"
      title="Move work forward without the clutter."
      description="TaskFlow keeps your day structured with a clean queue, fast editing, and just enough signal to stay in control."
      features={[
        "See your priority mix instantly from the dashboard.",
        "Capture tasks quickly and refine them later without losing context.",
        "Stay aligned across devices with a calmer, more deliberate workflow.",
      ]}
    >
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Sign in</h2>
        <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          Pick up where you left off.
        </p>
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
        <Link to="/register" className="font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
};
