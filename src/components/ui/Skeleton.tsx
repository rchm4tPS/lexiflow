interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export default function Skeleton({ className = '', width, height, circle = false }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer bg-gray-200 ${circle ? 'rounded-full' : 'rounded-md'} ${className}`}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
      }}
    />
  );
}
