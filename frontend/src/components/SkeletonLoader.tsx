import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const SkeletonPulse: React.FC<SkeletonProps> = ({ className = "" }) => (
  <div className={`animate-pulse bg-earth-200 dark:bg-forest-800 rounded-xl ${className}`} />
);

export const CardSkeleton: React.FC = () => (
  <div className="card-earth p-5 space-y-4">
    <div className="flex items-center space-x-3">
      <SkeletonPulse className="w-10 h-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <SkeletonPulse className="h-4 w-1/3" />
        <SkeletonPulse className="h-3 w-1/2" />
      </div>
    </div>
    <div className="space-y-2 pt-2">
      <SkeletonPulse className="h-16 w-full" />
      <div className="grid grid-cols-3 gap-2">
        <SkeletonPulse className="h-8" />
        <SkeletonPulse className="h-8" />
        <SkeletonPulse className="h-8" />
      </div>
    </div>
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div className="card-earth p-5 space-y-4">
    <div className="flex justify-between items-center">
      <SkeletonPulse className="h-4 w-1/4" />
      <SkeletonPulse className="h-4 w-16" />
    </div>
    <div className="h-48 flex items-end justify-between space-x-2 pt-4">
      <SkeletonPulse className="h-2/3 w-8" />
      <SkeletonPulse className="h-1/2 w-8" />
      <SkeletonPulse className="h-3/4 w-8" />
      <SkeletonPulse className="h-2/5 w-8" />
      <SkeletonPulse className="h-5/6 w-8" />
      <SkeletonPulse className="h-1/3 w-8" />
      <SkeletonPulse className="h-2/3 w-8" />
    </div>
  </div>
);

export const ListSkeleton: React.FC = () => (
  <div className="space-y-3">
    <SkeletonPulse className="h-16 w-full" />
    <SkeletonPulse className="h-16 w-full" />
    <SkeletonPulse className="h-16 w-full" />
  </div>
);
