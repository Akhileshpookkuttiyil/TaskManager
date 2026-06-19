import { differenceInCalendarDays, format, startOfDay, subDays } from "date-fns";
import { CalendarDays, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { Spinner } from "../components/ui/Spinner";
import { updateProfile } from "../store/slices/authSlice";
import { fetchStats, fetchTasks } from "../store/slices/tasksSlice";

const getStreakMetrics = (tasks) => {
  const completionDays = [...new Set(tasks.filter((task) => task.completedAt).map((task) => format(startOfDay(new Date(task.completedAt)), "yyyy-MM-dd")))];
  const completionSet = new Set(completionDays);

  let current = 0;
  let cursor = startOfDay(new Date());

  while (completionSet.has(format(cursor, "yyyy-MM-dd"))) {
    current += 1;
    cursor = subDays(cursor, 1);
  }

  let best = 0;
  let run = 0;
  let previousDate = null;

  completionDays
    .map((value) => new Date(`${value}T00:00:00`))
    .sort((a, b) => a - b)
    .forEach((date) => {
      if (previousDate && differenceInCalendarDays(date, previousDate) === 1) {
        run += 1;
      } else {
        run = 1;
      }

      best = Math.max(best, run);
      previousDate = date;
    });

  return { current, best };
};

const SummaryCard = ({ label, value, helper }) => (
  <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
    <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">{value}</p>
    {helper ? <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{helper}</p> : null}
  </div>
);

const FieldRow = ({ icon: Icon, label, value, helper }) => (
  <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-neutral-900 dark:text-white">{value}</p>
        {helper ? <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{helper}</p> : null}
      </div>
    </div>
  </div>
);

const ProfileSettingsForm = ({ user }) => {
  const dispatch = useDispatch();
  const { profileLoading } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextName = form.name.trim();
    const nextEmail = form.email.trim();

    if (!nextName || !nextEmail) {
      toast.error("Name and email are required.");
      return;
    }

    const hasPasswordFields = Boolean(form.currentPassword || form.newPassword);
    if ((form.currentPassword && !form.newPassword) || (!form.currentPassword && form.newPassword)) {
      toast.error("Enter both current and new password to change your password.");
      return;
    }

    const payload = {
      name: nextName,
      email: nextEmail,
    };

    if (hasPasswordFields) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
    }

    const result = await dispatch(updateProfile(payload));

    if (updateProfile.fulfilled.match(result)) {
      toast.success("Profile updated.");
      setForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
      }));
      return;
    }

    toast.error(result.payload || "Unable to update profile.");
  };

  return (
    <form className="card p-6" onSubmit={handleSubmit}>
      <div>
        <p className="section-eyebrow">Account settings</p>
        <h3 className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">Update your profile</h3>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Keep your public identity and security details up to date.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="label">
              Name
            </label>
            <input id="profile-name" name="name" value={form.name} onChange={handleChange} className="input" />
          </div>

          <div>
            <label htmlFor="profile-email" className="label">
              Email
            </label>
            <input id="profile-email" type="email" name="email" value={form.email} onChange={handleChange} className="input" />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300">
              <LockKeyhole size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">Change password</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Optional. Leave blank to keep your current password.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-current-password" className="label">
                Current password
              </label>
              <input
                id="profile-current-password"
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                className="input"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label htmlFor="profile-new-password" className="label">
                New password
              </label>
              <input
                id="profile-new-password"
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                className="input"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-end dark:border-neutral-800">
          <button type="submit" className="btn-primary min-w-[140px]" disabled={profileLoading}>
            {profileLoading ? <Spinner size="sm" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </form>
  );
};

export const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items, stats, loading: tasksLoading } = useSelector((state) => state.tasks);

  useEffect(() => {
    dispatch(fetchStats());
    dispatch(fetchTasks({ limit: 100, sortBy: "updatedAt", order: "desc" }));
  }, [dispatch]);

  const summary = useMemo(() => {
    const completed = stats?.done ?? stats?.completed ?? 0;
    const total = stats?.total ?? 0;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    const streaks = getStreakMetrics(items);

    return {
      total,
      completed,
      completionRate,
      currentStreak: streaks.current,
    };
  }, [items, stats]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="space-y-2">
        <p className="section-eyebrow">Account</p>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">Profile settings</h2>
        <p className="max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
          Keep your account details current and review your productivity snapshot in one place.
        </p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-neutral-900 text-2xl font-semibold text-white dark:bg-white dark:text-neutral-900">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="section-eyebrow">Profile information</p>
                <h3 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-white">{user?.name || "Your name"}</h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{user?.email || "your@email.com"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    <CalendarDays size={12} />
                    Member since {user?.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "-"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    <UserRound size={12} />
                    TaskFlow member
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <FieldRow icon={UserRound} label="Name" value={user?.name || "-"} helper="This is how your workspace greets you." />
              <FieldRow icon={Mail} label="Email" value={user?.email || "-"} helper="Used for login and notifications." />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-eyebrow">Account summary</p>
                <h3 className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">Productivity at a glance</h3>
              </div>
              <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300">
                {tasksLoading ? "Loading" : "Live data"}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SummaryCard label="Total tasks" value={summary.total} />
              <SummaryCard label="Completed" value={summary.completed} />
              <SummaryCard label="Current streak" value={summary.currentStreak} helper="Consecutive completion days" />
              <SummaryCard label="Completion rate" value={`${summary.completionRate}%`} helper="Completed out of all tasks" />
            </div>
          </div>
        </div>

        <ProfileSettingsForm key={user?._id || "profile"} user={user} />
      </section>
    </div>
  );
};
