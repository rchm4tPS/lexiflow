import { useState, useRef, useEffect } from 'react';
import { useReaderStore } from '../../../store/useReaderStore';
import { LEVELS } from '../../../constants/levels';
import { Icons } from '../../../constants/icons';

const LEVEL_SHORT_NAMES = ['B1', 'B2', 'I1', 'I2', 'A1', 'A2'];

export default function LevelRangeDropdown() {
    const { minLevelIndex, maxLevelIndex, setLevelRange, fetchLibrary } = useReaderStore();
    const [isOpen, setIsOpen] = useState(false);
    const [draftMin, setDraftMin] = useState(minLevelIndex);
    const [draftMax, setDraftMax] = useState(maxLevelIndex);
    const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    // Sync draft with store state when opening
    useEffect(() => {
        if (isOpen) {
            setDraftMin(minLevelIndex);
            setDraftMax(maxLevelIndex);
        }
    }, [isOpen, minLevelIndex, maxLevelIndex]);

    // Close popover on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSearch = () => {
        setLevelRange(draftMin, draftMax);
        fetchLibrary();
        setIsOpen(false);
    };

    const calculateStepFromEvent = (e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent): number => {
        if (!trackRef.current) return 0;
        const rect = trackRef.current.getBoundingClientRect();
        const clientX = 'touches' in e && (e as React.TouchEvent).touches && (e as React.TouchEvent).touches.length > 0
            ? (e as React.TouchEvent).touches[0].clientX
            : (e as MouseEvent).clientX;
        const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const pct = rect.width > 0 ? offsetX / rect.width : 0;
        const step = Math.round(pct * 5);
        return Math.max(0, Math.min(5, step));
    };

    const handleTrackMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        const step = calculateStepFromEvent(e);
        const distMin = Math.abs(step - draftMin);
        const distMax = Math.abs(step - draftMax);

        let target: 'min' | 'max' = 'min';
        if (distMin < distMax) {
            target = 'min';
            setDraftMin(Math.min(step, draftMax));
        } else if (distMax < distMin) {
            target = 'max';
            setDraftMax(Math.max(step, draftMin));
        } else {
            if (step <= draftMin) {
                target = 'min';
                setDraftMin(step);
            } else {
                target = 'max';
                setDraftMax(step);
            }
        }
        setActiveThumb(target);
    };

    useEffect(() => {
        const handlePointerMove = (e: MouseEvent | TouchEvent) => {
            if (!activeThumb) return;
            const step = calculateStepFromEvent(e);
            if (activeThumb === 'min') {
                setDraftMin(Math.min(step, draftMax));
            } else {
                setDraftMax(Math.max(step, draftMin));
            }
        };

        const handlePointerUp = () => {
            setActiveThumb(null);
        };

        if (activeThumb) {
            window.addEventListener('mousemove', handlePointerMove);
            window.addEventListener('mouseup', handlePointerUp);
            window.addEventListener('touchmove', handlePointerMove);
            window.addEventListener('touchend', handlePointerUp);
        }
        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [activeThumb, draftMin, draftMax]);

    const minPct = (draftMin / 5) * 100;
    const maxPct = (draftMax / 5) * 100;
    const trackWidthPct = maxPct - minPct;

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className="border border-yellow-400 rounded w-fit mt-2 px-3 py-2 leading-[18px] text-sm font-bold text-gray-700 bg-white shadow-sm cursor-pointer hover:bg-yellow-50/60 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
                <span>{LEVELS[minLevelIndex]} - {LEVELS[maxLevelIndex]}</span>
                <span className={`text-xs text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {/* Popover Dropdown */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-84 bg-white border border-gray-200 rounded-xl shadow-xl p-5 z-50 animate-in fade-in zoom-in duration-100 font-nunito">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Level Range Filter</span>
                        <button 
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 rounded-full hover:bg-gray-100 leading-none"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="text-base font-black text-gray-800 mb-4 flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        <span className="text-sm font-bold text-[#3890fc]">{LEVELS[draftMin]}</span>
                        <span className="text-gray-400 text-xs font-bold uppercase">to</span>
                        <span className="text-sm font-bold text-[#3890fc]">{LEVELS[draftMax]}</span>
                    </div>

                    {/* Double-Headed Slider Track Container */}
                    <div className="px-3 py-4 mb-4 select-none">
                        <div 
                            ref={trackRef}
                            onMouseDown={handleTrackMouseDown}
                            onTouchStart={handleTrackMouseDown}
                            className="relative w-full h-8 flex items-center cursor-pointer"
                        >
                            {/* Uncolored background line */}
                            <div className="absolute left-0 right-0 h-2 bg-gray-200 rounded-full" />

                            {/* Colored connecting line between Head 1 (draftMin) and Head 2 (draftMax) */}
                            <div
                                className="absolute h-2 bg-[#3890fc] rounded-full transition-all duration-75"
                                style={{
                                    left: `${minPct}%`,
                                    width: `${trackWidthPct}%`
                                }}
                            />

                            {/* Beads (6 points for 6 level steps) */}
                            {LEVELS.map((lvl, i) => {
                                const isColored = i >= draftMin && i <= draftMax;
                                const posPct = (i / 5) * 100;

                                return (
                                    <div
                                        key={lvl}
                                        style={{ left: `${posPct}%` }}
                                        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full transition-all duration-150 pointer-events-none z-10 ${
                                            isColored
                                                ? 'bg-[#3890fc] border-2 border-white ring-1 ring-blue-300'
                                                : 'bg-gray-200 border-2 border-gray-300'
                                        }`}
                                    />
                                );
                            })}

                            {/* Head 1 Thumb (Min Level Handle) */}
                            <div
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setActiveThumb('min');
                                }}
                                onTouchStart={(e) => {
                                    e.stopPropagation();
                                    setActiveThumb('min');
                                }}
                                style={{ left: `${minPct}%` }}
                                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#3890fc] shadow-md rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform hover:scale-110 ${activeThumb === 'min' ? 'z-30 scale-110 ring-2 ring-blue-400' : 'z-20'}`}
                                title={`Min: ${LEVELS[draftMin]}`}
                            >
                                <div className="w-2 h-2 bg-[#3890fc] rounded-full" />
                            </div>

                            {/* Head 2 Thumb (Max Level Handle) */}
                            <div
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setActiveThumb('max');
                                }}
                                onTouchStart={(e) => {
                                    e.stopPropagation();
                                    setActiveThumb('max');
                                }}
                                style={{ left: `${maxPct}%` }}
                                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#3890fc] border-2 border-white shadow-md ring-2 ring-blue-300 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform hover:scale-110 ${activeThumb === 'max' ? 'z-30 scale-110 ring-4 ring-blue-300' : 'z-20'}`}
                                title={`Max: ${LEVELS[draftMax]}`}
                            >
                                <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                        </div>

                        {/* Step Labels */}
                        <div className="relative w-full flex justify-between mt-2 text-[11px] font-bold text-gray-500 select-none">
                            {LEVEL_SHORT_NAMES.map((name, i) => {
                                const isColored = i >= draftMin && i <= draftMax;
                                return (
                                    <span
                                        key={name}
                                        onClick={() => {
                                            if (i < draftMin) setDraftMin(i);
                                            else if (i > draftMax) setDraftMax(i);
                                            else {
                                                if (Math.abs(i - draftMin) <= Math.abs(i - draftMax)) setDraftMin(i);
                                                else setDraftMax(i);
                                            }
                                        }}
                                        className={`cursor-pointer transition-colors px-1 py-0.5 rounded hover:bg-gray-100 ${isColored ? 'text-[#3890fc] font-black' : 'text-gray-400'}`}
                                        title={LEVELS[i]}
                                    >
                                        {name}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Search / Apply Button */}
                    <button
                        type="button"
                        onClick={handleSearch}
                        className="w-full bg-[#3890fc] hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <Icons.Search size={16} />
                        Search Feed
                    </button>
                </div>
            )}
        </div>
    );
}
