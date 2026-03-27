import React from "react";
import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200 dark:bg-slate-800 rounded",
        className,
      )}
    />
  );
};

export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
      <Skeleton className="w-24 h-3 mb-2" />
      <Skeleton className="w-16 h-8" />
      <Skeleton className="w-full h-1 mt-4 rounded-full" />
    </div>
  );
};

export const ActivityItemSkeleton: React.FC = () => {
  return (
    <div className="flex gap-4 relative">
      <Skeleton className="w-5 h-5 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-20 h-3" />
      </div>
    </div>
  );
};

export const TableRowSkeleton: React.FC = () => {
  return (
    <tr className="border-b border-outline-variant/10 dark:border-slate-800">
      <td className="px-8 py-5">
        <Skeleton className="w-48 h-4 mb-1" />
        <Skeleton className="w-32 h-3" />
      </td>
      <td className="px-8 py-5">
        <Skeleton className="w-16 h-6 rounded" />
      </td>
      <td className="px-8 py-5">
        <Skeleton className="w-20 h-4" />
      </td>
      <td className="px-8 py-5">
        <Skeleton className="w-12 h-3" />
      </td>
      <td className="px-8 py-5 text-right">
        <div className="flex items-center justify-end gap-3">
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-16 h-1.5 rounded-full" />
        </div>
      </td>
    </tr>
  );
};

// Default export for backward compatibility
export default Skeleton;
