import { cn } from './utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'text', width, height, ...props }: SkeletonProps) {
  const baseStyles = 'animate-pulse rounded bg-gray-800';
  
  const variantStyles = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      }}
      {...props}
    />
  );
}

export function CardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      <Skeleton className="h-6 w-3/4" variant="text" />
      <Skeleton className="h-4 w-1/2" variant="text" />
      <Skeleton className="h-4 w-1/3" variant="text" />
    </div>
  );
}

export function StatCardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      <Skeleton className="h-4 w-1/3" variant="text" />
      <Skeleton className="h-8 w-1/2" variant="text" />
      <Skeleton className="h-4 w-1/4" variant="text" />
    </div>
  );
}

export function ProfileCardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col lg:flex-row gap-6', className)} {...props}>
      <div className="flex justify-center lg:justify-start">
        <Skeleton className="w-32 h-32 rounded-full" variant="circular" />
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function ProgressChartSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('h-[300px]', className)} {...props}>
      <Skeleton className="w-full h-full" variant="rectangular" />
    </div>
  );
}

export function ProgressHistorySkeleton({ className, count = 3, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-2">
          <Skeleton className="h-6 w-1/3" variant="text" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-8 w-full" variant="text" />
            <Skeleton className="h-8 w-full" variant="text" />
            <Skeleton className="h-8 w-full" variant="text" />
          </div>
        </div>
      ))}
    </div>
  );
}