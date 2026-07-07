export const StatCard = ({ title, value, icon: Icon, color = 'emerald', trend, onClick }) => {
  const colorTextMap = {
    emerald: 'text-[#2E7D32] dark:text-[#66BB6A]',
    blue: 'text-[#3B82F6]',
    yellow: 'text-[#F59E0B]',
    red: 'text-[#EF4444]',
    purple: 'text-violet-600 dark:text-violet-400',
  };

  const iconBgClasses = {
    emerald: 'bg-[#2E7D32]/10 text-[#2E7D32] dark:text-[#66BB6A]',
    blue: 'bg-[#3B82F6]/10 text-[#3B82F6]',
    yellow: 'bg-[#F59E0B]/10 text-[#F59E0B]',
    red: 'bg-[#EF4444]/10 text-[#EF4444]',
    purple: 'bg-violet-600/10 text-violet-600',
  };

  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onClick,
        onKeyDown: (event) => {
          if (event.key === 'Enter') onClick();
        },
      }
    : {};

  return (
    <div
      {...interactiveProps}
      className={`group card p-5 ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase text-slate-400 dark:text-gray-500 tracking-wider">{title}</p>
          <p className={`mt-3 text-3xl font-extrabold ${colorTextMap[color] || colorTextMap.emerald}`}>{value}</p>
          {trend && (
            <p className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-500">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-300"></span>
              {trend}
            </p>
          )}
          {onClick && <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">View details →</p>}
        </div>
        {Icon && (
          <div className={`rounded-xl p-3.5 ${iconBgClasses[color]}`}>
            <Icon className="h-6 w-6" strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
};
