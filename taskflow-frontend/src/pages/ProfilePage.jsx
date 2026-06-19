import { format } from "date-fns";
import { CalendarDays, Mail, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStats } from "../store/slices/tasksSlice";

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
      <Icon size={15} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-neutral-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { stats } = useSelector((state) => state.tasks);

  useEffect(() => {
    if (!stats) {
      dispatch(fetchStats());
    }
  }, [dispatch, stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-lg font-semibold text-white dark:bg-white dark:text-neutral-900">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{user?.name}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{user?.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total", value: stats?.total ?? 0 },
            { label: "In progress", value: stats?.in_progress ?? 0 },
            { label: "Done", value: stats?.done ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="card min-w-[84px] flex-1 px-3 py-2.5 text-center sm:flex-initial">
              <p className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="card max-w-xl p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Account details</h3>
        <div className="mt-1 divide-y divide-neutral-100 dark:divide-neutral-800">
          <InfoRow icon={UserRound} label="Full name" value={user?.name || "-"} />
          <InfoRow icon={Mail} label="Email" value={user?.email || "-"} />
          <InfoRow
            icon={CalendarDays}
            label="Member since"
            value={user?.createdAt ? format(new Date(user.createdAt), "MMMM d, yyyy") : "-"}
          />
        </div>
      </section>
    </div>
  );
};
