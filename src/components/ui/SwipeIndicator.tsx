import React from 'react';

interface SwipeIndicatorProps {
  progress: number;
  direction: 'prev' | 'next' | null;
  currentPage: number;
  totalPages: number;
}

const SwipeIndicator = ({ progress, direction, currentPage, totalPages }: SwipeIndicatorProps) => {
  if (progress <= 0 || !direction) return null;

  const targetPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
  if (targetPage < 0 || targetPage >= totalPages) return null;

  const opacity = Math.min(1, progress * 2);

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-50 transition-opacity duration-75"
      style={{ opacity }}
    >
      <div className="bg-gray-900/75 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2">
        <span className="tabular-nums">{currentPage + 1}</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={direction === 'next' ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
        </svg>
        <span className="tabular-nums">{targetPage + 1}</span>
      </div>
    </div>
  );
};

export default SwipeIndicator;