import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AuthShell } from "../components/auth/AuthShell";
import { FieldError } from "../components/ui/shared";
import { Spinner } from "../components/ui/Spinner";
import { clearError, registerUser } from "../store/slices/authSlice";

export const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, token } = useSelector((s) => s.auth);

  const [form, setForm] = useState({ name: "", email: "", password: "" });
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

    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!form.password) nextErrors.password = "Password is required.";
    if (form.password && form.password.length < 6) nextErrors.password = "Use at least 6 characters.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      toast.error("Please complete the required fields.");
      return;
    }

    const result = await dispatch(
      registerUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
    );

    if (registerUser.fulfilled.match(result)) {
      toast.success("Account created.");
      navigate("/");
    }
  };

  return (
    <AuthShell
      eyebrow="Set up once"
      title="Build a task system you actually enjoy opening."
      description="Create your workspace, start capturing work instantly, and keep your priorities visible without adding process overhead."
      features={[
        "Organize tasks by status, priority, and due date from day one.",
        "Search and filter quickly when your list starts to grow.",
        "Present a cleaner, more professional workflow in demos and reviews.",
      ]}
    >
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Create your account</h2>
        <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          Free to use, fast to set up.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label htmlFor="register-name" className="label">
            Full name
          </label>
          <input
            id="register-name"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Jane Doe"
            className={`input ${errors.name ? "input-error" : ""}`}
            autoComplete="name"
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <label htmlFor="register-email" className="label">
            Email
          </label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              className={`input pr-11 ${errors.password ? "input-error" : ""}`}
              autoComplete="new-password"
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
          {loading ? <Spinner size="sm" /> : <UserPlus size={16} />}
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};
