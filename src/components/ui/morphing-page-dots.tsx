export default function MorphingPageDots({
    total,
    activeIndex,
    onChange
}: {
    total: number;
    activeIndex: number;
    onChange?: (index: number) => void;
}) {
    if (total <= 1) return null;

    return (
        <div className="flex items-center justify-center space-x-2">
            <button 
                onClick={() => onChange?.(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed mx-1 transition-colors cursor-pointer"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    onClick={() => onChange?.(i)}
                    className={`cursor-pointer transition-all duration-300 ease-in-out rounded-full ${
                        i === activeIndex
                            ? 'w-6 h-3 bg-gray-400' 
                            : 'w-3 h-3 bg-gray-200 hover:bg-gray-300' 
                    }`}
                />
            ))}

            <button 
                onClick={() => onChange?.(Math.min(total - 1, activeIndex + 1))}
                disabled={activeIndex === total - 1}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed mx-1 transition-colors cursor-pointer"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
        </div>
    );
}
