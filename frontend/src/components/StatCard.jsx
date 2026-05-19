export const StatCard = ({ title, value, icon: Icon, color = 'emerald', trend }) => {
  const colorClasses = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-50',
    blue: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/35 dark:text-sky-50',
    yellow: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-50',
    red: 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/35 dark:text-rose-50',
    purple: 'border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/35 dark:text-violet-50',
  };

  const iconBgClasses = {
    emerald: 'bg-emerald-600 text-white',
    blue: 'bg-sky-600 text-white',
    yellow: 'bg-amber-500 text-white',
    red: 'bg-rose-600 text-white',
    purple: 'bg-violet-600 text-white',
  };

  return (
    <div className={`group rounded-lg border p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md-soft ${colorClasses[color] || colorClasses.emerald}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase text-current/70">{title}</p>
          <p className="mt-3 text-3xl font-bold">{value}</p>
          {trend && (
            <p className="mt-3 flex items-center gap-1 text-xs font-medium text-current/70">
              <span className="inline-block h-2 w-2 rounded-full bg-current/40"></span>
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`rounded-lg p-3 ${iconBgClasses[color]}`}>
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  );
};
