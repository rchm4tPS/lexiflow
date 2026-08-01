import { type ReactNode } from 'react';

interface SlidingContentProps {
  activeIndex: number;
  rtl?: boolean;
  duration?: number;
  className?: string;
  children: ReactNode;
}

export default function SlidingContent({
  activeIndex,
  rtl = false,
  duration = 300,
  className = '',
  children,
}: SlidingContentProps) {
  const count = Array.isArray(children) ? children.length : 1;
  const translateX = rtl ? activeIndex * (100 / count) : -activeIndex * (100 / count);

  return (
    <div className={`overflow-hidden ${className}`} style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          flexShrink: 0,
          transform: `translateX(${translateX}%)`,
          transition: `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          width: `${count * 100}%`,
        }}
      >
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div
                key={i}
                className="flex-shrink-0"
                style={{ width: `${100 / count}%` }}
                aria-hidden={i !== activeIndex}
              >
                {child}
              </div>
            ))
          : children}
      </div>
    </div>
  );
}