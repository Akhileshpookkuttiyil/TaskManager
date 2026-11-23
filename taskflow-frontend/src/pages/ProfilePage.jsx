import { differenceInCalendarDays, format, startOfDay, subDays } from "date-fns";
import { CalendarDays, LockKeyhole, Mail, UserRound, Sparkles, Globe } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { Spinner } from "../components/ui/Spinner";
import { updateProfile } from "../store/slices/authSlice";
import { fetchStats, fetchAnalyticsTasks } from "../store/slices/tasksSlice";
import { useTheme } from "../components/theme/theme-context";
import { parseDateTimeValue } from "../utils/dates";

const getStreakMetrics = (tasks) => {
  const completionDays = [
    ...new Set(
      tasks
        .filter((task) => (task.status === "completed" || task.status === "archived") && (task.completedAt || task.updatedAt))
        .map((task) => {
          const d = parseDateTimeValue(task.completedAt) || parseDateTimeValue(task.updatedAt);
          return d ? format(startOfDay(d), "yyyy-MM-dd") : null;
        })
        .filter(Boolean)
    ),
  ];
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
  <div className="rounded-2xl border border-subtle bg-elevated p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
    <p className="mt-2 text-2xl font-semibold tabular-nums text-primary">{value}</p>
    {helper ? <p className="mt-1 text-sm text-muted">{helper}</p> : null}
  </div>
);

const FieldRow = ({ icon: Icon, label, value, helper }) => (
  <div className="rounded-2xl border border-subtle bg-elevated p-4">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app text-secondary">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-primary">{value}</p>
        {helper ? <p className="mt-1 text-sm text-muted">{helper}</p> : null}
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
        <h3 className="mt-1 text-base font-semibold text-primary">Update your profile</h3>
        <p className="mt-1 text-sm text-muted">
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

        <div className="rounded-2xl border border-subtle bg-elevated p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app text-secondary">
              <LockKeyhole size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Change password</p>
              <p className="text-sm text-muted">Optional. Leave blank to keep your current password.</p>
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

        <div className="flex flex-col-reverse gap-2.5 border-t border-neutral pt-4 sm:flex-row sm:justify-end">
          <button type="submit" className="btn-primary min-w-[140px]" disabled={profileLoading}>
            {profileLoading ? <Spinner size="sm" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </form>
  );
};

const PreferencesSettingsForm = () => {
  const { theme, setTheme } = useTheme();

  const [defaultPriority, setDefaultPriority] = useState(
    () => localStorage.getItem("taskflow-settings-default-priority") || "medium"
  );
  const [defaultOffset, setDefaultOffset] = useState(
    () => localStorage.getItem("taskflow-settings-default-offset-hours") || "24"
  );
  const [timezone, setTimezone] = useState(
    () => localStorage.getItem("taskflow-settings-timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const handleSavePreferences = (e) => {
    e.preventDefault();
    localStorage.setItem("taskflow-settings-default-priority", defaultPriority);
    localStorage.setItem("taskflow-settings-default-offset-hours", defaultOffset);
    localStorage.setItem("taskflow-settings-timezone", timezone);
    toast.success("Preferences saved successfully!");
  };

  return (
    <form className="card p-6 space-y-5" onSubmit={handleSavePreferences}>
      <div>
        <p className="section-eyebrow">Preferences</p>
        <h3 className="mt-1 text-base font-semibold text-primary">Workspace Preferences</h3>
        <p className="mt-1 text-sm text-muted">
          Customize theme, default task priority, offsets, and timezone profiles.
        </p>
      </div>

      <div className="space-y-4">
        {/* Appearance Mode */}
        <div>
          <label className="label">Appearance</label>
          <div className="flex gap-1 rounded-md border border-subtle p-0.5 bg-elevated w-fit">
            {[
              { id: "light", label: "Light" },
              { id: "dark", label: "Dark" },
              { id: "system", label: "System" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  theme === opt.id
                    ? "bg-app text-primary shadow-sm border border-neutral"
                    : "text-muted hover:text-primary hover:bg-hover"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Setting */}
        <div>
          <label htmlFor="pref-priority" className="label">Default Task Priority</label>
          <select
            id="pref-priority"
            value={defaultPriority}
            onChange={(e) => setDefaultPriority(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Default Date Offset */}
        <div>
          <label htmlFor="pref-offset" className="label">Default Due Date Offset</label>
          <select
            id="pref-offset"
            value={defaultOffset}
            onChange={(e) => setDefaultOffset(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="0">Today</option>
            <option value="24">Tomorrow (24 hours)</option>
            <option value="72">3 Days (72 hours)</option>
            <option value="168">7 Days (168 hours)</option>
          </select>
        </div>

        {/* Timezone Profile */}
        <div>
          <label htmlFor="pref-timezone" className="label flex items-center gap-1">
            <Globe size={13} />
            Timezone Profile
          </label>
          <select
            id="pref-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="UTC">UTC (Coordinated Universal Time)</option>
            <option value="America/New_York">EST/EDT (New York)</option>
            <option value="America/Chicago">CST/CDT (Chicago)</option>
            <option value="America/Denver">MST/MDT (Denver)</option>
            <option value="America/Los_Angeles">PST/PDT (Los Angeles)</option>
            <option value="Europe/London">GMT/BST (London)</option>
            <option value="Europe/Paris">CET/CEST (Paris)</option>
            <option value="Asia/Kolkata">IST (Kolkata)</option>
            <option value="Asia/Tokyo">JST (Tokyo)</option>
            <option value="Australia/Sydney">AEST/AEDT (Sydney)</option>
          </select>
        </div>

        <div className="flex justify-end pt-2 border-t border-neutral">
          <button type="submit" className="btn-primary min-w-[140px]">
            Save preferences
          </button>
        </div>
      </div>
    </form>
  );
};

export const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { stats, loading: tasksLoading } = useSelector((state) => state.tasks);
  const { tasks: analyticsTasks = [] } = useSelector((state) => state.tasks.analytics || {});

  useEffect(() => {
    dispatch(fetchStats());
    dispatch(fetchAnalyticsTasks());
  }, [dispatch]);

  const summary = useMemo(() => {
    const completed = stats?.done ?? stats?.completed ?? 0;
    const total = stats?.total ?? 0;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    const streaks = getStreakMetrics(analyticsTasks);

    return {
      total,
      completed,
      completionRate,
      currentStreak: streaks.current,
    };
  }, [analyticsTasks, stats]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="section-eyebrow">Account</p>
        <h2 className="text-2xl font-semibold text-primary">Profile settings</h2>
        <p className="max-w-2xl text-sm text-muted">
          Keep your account details current and review your productivity snapshot in one place.
        </p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* Left Column Data readouts */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--text-primary)] text-2xl font-semibold text-[var(--bg-app)]">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="section-eyebrow">Profile information</p>
                <h3 className="mt-1 text-xl font-semibold text-primary">{user?.name || "Your name"}</h3>
                <p className="mt-1 text-sm text-muted">{user?.email || "your@email.com"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-elevated border border-subtle px-3 py-1 text-xs font-medium text-secondary">
                    <CalendarDays size={12} />
                    Member since {user?.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "-"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-elevated border border-subtle px-3 py-1 text-xs font-medium text-secondary">
                    <Sparkles size={12} className="text-muted" />
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
                <h3 className="mt-1 text-base font-semibold text-primary">Productivity at a glance</h3>
              </div>
              <div className="rounded-full bg-elevated border border-subtle px-3 py-1 text-xs font-medium text-muted">
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

        {/* Right Column Forms */}
        <div className="space-y-6">
          <ProfileSettingsForm key={user?._id || "profile"} user={user} />
          <PreferencesSettingsForm />
        </div>
      </section>
    </div>
  );
};
export default ProfilePage;
