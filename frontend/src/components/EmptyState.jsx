import { Sprout } from 'lucide-react';

export const EmptyState = ({ title, message, onRetry }) => (
  <div className="card flex flex-col items-center py-12 text-center">
    <div className="mb-4 rounded-2xl bg-emerald-100 p-4 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      <Sprout className="h-8 w-8" />
    </div>
    <h2 className="text-lg font-bold">{title}</h2>
    <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
    {onRetry && <button onClick={onRetry} className="btn btn-secondary mt-4">Retry</button>}
  </div>
);
