import { useState, useEffect } from 'react';

export default function MorphingPageDots({
    total,
    activeIndex,
    onChange,
    isRTL
}: {
    total: number;
    activeIndex: number;
    onChange?: (index: number) => void;
    isRTL?: boolean;
}) {
    const [inputVal, setInputVal] = useState((activeIndex + 1).toString());

    useEffect(() => {
        setInputVal((activeIndex + 1).toString());
    }, [activeIndex]);

    const handleInputSubmit = () => {
        let val = parseInt(inputVal);
        if (isNaN(val)) val = activeIndex + 1;
        if (val < 1) val = 1;
        if (val > total) val = total;
        setInputVal(val.toString());
        if (val - 1 !== activeIndex) {
            onChange?.(val - 1);
        }
    };

    if (total <= 1) return null;

    return (
        <div className="flex items-center justify-center space-x-2">
            <button 
                onClick={() => onChange?.(isRTL ? Math.min(total - 1, activeIndex + 1) : Math.max(0, activeIndex - 1))}
                disabled={isRTL ? activeIndex === total - 1 : activeIndex === 0}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed mx-1 transition-colors cursor-pointer"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            
            {total <= 10 ? (
                Array.from({ length: total }).map((_, idx) => {
                    const i = isRTL ? total - 1 - idx : idx;
                    return (
                        <div
                            key={i}
                            onClick={() => onChange?.(i)}
                            className={`cursor-pointer transition-all duration-300 ease-in-out rounded-full ${
                                i === activeIndex
                                    ? 'w-6 h-3 bg-gray-400' 
                                    : 'w-3 h-3 bg-gray-200 hover:bg-gray-300' 
                            }`}
                        />
                    );
                })
            ) : (
                <div className="flex items-center justify-center px-2 w-fit gap-1.5" dir="ltr">
                    <input 
                        type="number"
                        className="bg-transparent hover:bg-gray-100 focus:bg-gray-100 transition-colors text-gray-700 font-bold text-[15px] outline-none text-center rounded-md w-10 h-7 hide-number-spinners"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onBlur={handleInputSubmit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.currentTarget.blur();
                            }
                        }}
                    />
                    <span className="text-gray-500 font-semibold text-[15px] pt-0.5">/ {total}</span>
                </div>
            )}

            <button 
                onClick={() => onChange?.(isRTL ? Math.max(0, activeIndex - 1) : Math.min(total - 1, activeIndex + 1))}
                disabled={isRTL ? activeIndex === 0 : activeIndex === total - 1}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed mx-1 transition-colors cursor-pointer"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
        </div>
    );
}
