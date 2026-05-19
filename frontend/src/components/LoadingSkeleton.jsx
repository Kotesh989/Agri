export const LoadingSkeleton = ({ rows = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-gray-800" />
    ))}
  </div>
);
