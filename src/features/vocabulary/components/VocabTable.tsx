import { useState, useRef, useEffect } from 'react';
import { Edit as EditIcon } from 'lucide-react';
import { VocabRowSkeleton } from '../../../components/ui/Skeletons';

type VocabItem = {
  id: string;
  word: string;
  meaning: string | null;
  /** JSON array of multiple meanings — first is primary */
  meanings?: string[] | null;
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  word_tags?: string[];
  related_phrase_occur?: string | null;
};

interface VocabTableProps {
    items: VocabItem[];
    isLoading: boolean;
    total: number;
    selectedIds: string[];
    onToggleSelectAll: () => void;
    onToggleSelect: (id: string) => void;
    onUpdateStage: (item: VocabItem, stage: number) => void;
    editingId: string | null;
    editMeaning: string;
    onStartEditing: (item: VocabItem) => void;
    onSetEditMeaning: (meaning: string) => void;
    onSaveEdit: (item: VocabItem) => void;
    onClearSelection?: () => void;
}

export default function VocabTable({
    items, isLoading, total: _total, selectedIds,
    onToggleSelectAll, onToggleSelect,
    onUpdateStage, editingId, editMeaning,
    onStartEditing, onSetEditMeaning, onSaveEdit,
    onClearSelection: _onClearSelection
}: VocabTableProps) {
    // Single-source-of-truth: only one row's status popover can be open at a time
    const [openStatusRowId, setOpenStatusRowId] = useState<string | null>(null);

    return (
        <div className="flex flex-col grow w-full">
            {/* Desktop Table Header (>= 640px ONLY) */}
            <div className="hidden sm:flex text-xs font-bold text-gray-400 mb-2 px-4 shadow-2xs pb-2 border-b">
                <div className="w-[25%] flex items-center">
                    <input
                        type="checkbox"
                        className="mr-2 cursor-pointer"
                        checked={items.length > 0 && selectedIds.length === items.length}
                        onChange={onToggleSelectAll}
                    />
                    TERM ({items.length} IN VIEW)
                </div>
                <div className="w-[25%]">TRANSLATION</div>
                <div className="w-[15%]">CONTEXT PHRASE</div>
                <div className="w-[35%] text-center">STATUS</div>
            </div>

            {/* Table Body */}
            <div className="flex flex-col">
                {isLoading ? (
                    [...Array(10)].map((_, i) => <VocabRowSkeleton key={i} />)
                ) : items.length !== 0 ? items.map((item, idx) => (
                    <VocabRow
                        key={item.id}
                        item={item}
                        isEven={idx % 2 === 0}
                        isSelected={selectedIds.includes(item.id)}
                        isSelectionActive={selectedIds.length > 0}
                        onToggleSelect={() => onToggleSelect(item.id)}
                        onUpdateStage={(s: number) => onUpdateStage(item, s)}
                        isEditing={editingId === item.id}
                        editMeaning={editMeaning}
                        onStartEditing={() => onStartEditing(item)}
                        onSetEditMeaning={onSetEditMeaning}
                        onSaveEdit={() => onSaveEdit(item)}
                        isStatusOpen={openStatusRowId === item.id}
                        onToggleStatus={() => setOpenStatusRowId(prev => prev === item.id ? null : item.id)}
                        onCloseStatus={() => setOpenStatusRowId(null)}
                    />
                )) : (
                    <div className="p-10 flex flex-col gap-6 text-center">
                        <div className="text-gray-400 text-lg">No vocabulary found in this view.</div>
                        <div className="text-gray-400 text-sm">Read pages to add LingQs or adjust filters!</div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface VocabRowProps {
    item: VocabItem;
    isEven: boolean;
    isSelected: boolean;
    isSelectionActive: boolean;
    onToggleSelect: () => void;
    onUpdateStage: (stage: number) => void;
    isEditing: boolean;
    editMeaning: string;
    onStartEditing: () => void;
    onSetEditMeaning: (meaning: string) => void;
    onSaveEdit: () => void;
    isStatusOpen: boolean;
    onToggleStatus: () => void;
    onCloseStatus: () => void;
}

function VocabRow({
    item, isEven, isSelected, isSelectionActive, onToggleSelect,
    onUpdateStage, isEditing, editMeaning,
    onStartEditing, onSetEditMeaning, onSaveEdit,
    isStatusOpen, onToggleStatus, onCloseStatus
}: VocabRowProps) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const touchStartYRef = useRef<number | null>(null);
    const [popoverUpward, setPopoverUpward] = useState(false);

    // Close status popover when clicking outside
    const handleStatusToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Check position before toggling: if the badge is near the bottom,
        // render the popover upward to avoid being clipped by BottomNav / screen edge
        if (statusRef.current) {
            const rect = statusRef.current.getBoundingClientRect();
            const bottomNavH = 64; // BottomNav h-16
            const popoverH = 200; // estimated max popover height
            const spaceBelow = window.innerHeight - rect.bottom - bottomNavH;
            setPopoverUpward(spaceBelow < popoverH);
        }
        onToggleStatus();
    };

    // Close popover when clicking outside
    useEffect(() => {
        if (!isStatusOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
                onCloseStatus();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isStatusOpen, onCloseStatus]);

    const handlePressStart = (e: React.TouchEvent | React.MouseEvent) => {
        if ('touches' in e) {
            touchStartYRef.current = e.touches[0].clientY;
        } else {
            touchStartYRef.current = e.clientY;
        }
        timerRef.current = setTimeout(() => {
            onToggleSelect();
        }, 600);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartYRef.current !== null) {
            const delta = Math.abs(e.touches[0].clientY - touchStartYRef.current);
            if (delta > 10) {
                // User is scrolling, cancel the long-press timer
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
                touchStartYRef.current = null;
            }
        }
    };

    const handlePressEnd = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        touchStartYRef.current = null;
    };

    const handleRowClick = () => {
        if (isSelectionActive) {
            onToggleSelect();
        }
    };

    // Word Token Yellow (#FCE473 opacity) vs Phrase Orange stage colors matching PhraseGroup.tsx
    const isPhrase = item.word ? item.word.trim().includes(' ') : false;
    const getStageStyle = (stage: number) => {
        if (isPhrase) {
            switch(stage) {
                case 1: return 'bg-orange-500 text-white border-orange-600';
                case 2: return 'bg-orange-400 text-white border-orange-500';
                case 3: return 'bg-orange-300 text-orange-950 border-orange-400';
                case 4: return 'bg-orange-200 text-orange-950 border-orange-300';
                case 5: return 'bg-[#4ac9c5] text-white border-teal-500';
                case 6: return 'bg-gray-300 text-gray-700 border-gray-400';
                default: return 'bg-orange-500 text-white border-orange-600';
            }
        }
        switch(stage) {
            case 1: return 'bg-[#fce473] text-amber-950 border-amber-400'; // 100% opacity WordToken Yellow
            case 2: return 'bg-[#fce473]/75 text-amber-950 border-amber-300'; // 75% opacity WordToken Yellow
            case 3: return 'bg-[#fce473]/50 text-amber-950 border-amber-300'; // 50% opacity WordToken Yellow
            case 4: return 'bg-[#fce473]/25 text-amber-950 border-amber-200'; // 25% opacity WordToken Yellow
            case 5: return 'bg-[#4ac9c5] text-white border-teal-500'; // Known (Teal)
            case 6: return 'bg-gray-300 text-gray-700 border-gray-400'; // Ignored (Gray)
            default: return 'bg-[#fce473] text-amber-950 border-amber-400';
        }
    };

    return (
        <div
            onClick={handleRowClick}
            onTouchStart={handlePressStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handlePressEnd}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            className={`flex items-center py-3 px-5 sm:px-6 border-b border-gray-100 ${isEven ? 'bg-[#fcfdfe]' : 'bg-white'} hover:bg-blue-50/50 transition cursor-pointer relative group ${isSelected ? 'bg-blue-50/80' : ''}`}
        >
            {/* ── MOBILE ROW (< 640px) matching screenshot ── */}
            <div className="flex sm:hidden items-center w-full min-w-0 py-1">
                {/* 1. Stage Badge Pill (Far Left) */}
                <div className="w-10 shrink-0 flex flex-col items-center justify-center mr-3 relative" ref={statusRef}>
                    <button
                        type="button"
                        onClick={handleStatusToggle}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-extrabold text-xs shadow-2xs transition-transform active:scale-95 cursor-pointer ${getStageStyle(item.stage)}`}
                        title="Change Stage"
                    >
                        {item.stage === 5 ? '✔' : item.stage === 6 ? '⊘' : item.stage}
                    </button>

                    {/* Stage Yellow Coins / Dots */}
                    <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4].map(num => (
                            <div 
                                key={num} 
                                className={`w-1.5 h-1.5 rounded-full ${item.stage >= num ? 'bg-amber-400' : 'bg-gray-200'}`}
                            />
                        ))}
                    </div>

                    {/* Stage Popover Dropdown — renders upward if near bottom edge */}
                    {isStatusOpen && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute left-0 ${popoverUpward ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 min-w-[120px] font-bold text-xs`}
                        >
                            {[1, 2, 3, 4].map(num => (
                                <div
                                    key={num}
                                    onClick={() => { onUpdateStage(num); onCloseStatus(); }}
                                    className={`px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-amber-50 ${item.stage === num ? 'text-amber-700 bg-amber-50/80' : 'text-gray-700'}`}
                                >
                                    <span className="w-4 text-center font-extrabold">{num}</span> Stage {num}
                                </div>
                            ))}
                            <div
                                onClick={() => { onUpdateStage(5); onCloseStatus(); }}
                                className={`px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-green-50 text-green-600 ${item.stage === 5 ? 'bg-green-50/50' : ''}`}
                            >
                                <span className="w-4 text-center font-extrabold">✔</span> Known
                            </div>
                            <div
                                onClick={() => { onUpdateStage(6); onCloseStatus(); }}
                                className={`px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-red-50 text-red-500 ${item.stage === 6 ? 'bg-red-50/50' : ''}`}
                            >
                                <span className="w-4 text-center font-extrabold">⊘</span> Ignore
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Word Term Column (Middle-Left) */}
                <div className="w-[36%] shrink-0 flex flex-col justify-center min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-800 text-sm break-words whitespace-normal">
                            {item.word}
                        </span>
                        {isSelected && (
                            <span className="bg-blue-500 text-white text-[10px] px-1 rounded-full font-bold">✓</span>
                        )}
                    </div>

                    {/* Word Tags */}
                    {item.word_tags && item.word_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                            {item.word_tags.map((tag: string) => (
                                <span key={tag} className="bg-blue-50 border border-blue-100 text-blue-600 px-1 py-px text-[9px] rounded font-bold uppercase break-words max-w-[80px]">
                                    {tag.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Translation Column starting at fixed column position with UK flag (Matching Screenshot!) */}
                <div
                    className="flex-1 min-w-0 flex items-center text-left text-gray-600 text-xs sm:text-sm pl-1 cursor-text group/trans"
                    onClick={(e) => { e.stopPropagation(); onStartEditing(); }}
                >
                    <span className="mr-1.5 text-base shrink-0">🇬🇧</span>
                    {isEditing ? (
                        <input
                            autoFocus
                            className="border border-blue-400 rounded px-2 py-0.5 outline-none font-medium text-xs w-full"
                            value={editMeaning}
                            onChange={(e) => onSetEditMeaning(e.target.value)}
                            onBlur={onSaveEdit}
                            onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(); }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className={`break-words whitespace-normal text-left flex items-center gap-1 ${item.meaning ? 'text-gray-700 font-medium' : 'italic text-gray-400'}`}>
                            <span>{item.meaning || 'Add translation...'}</span>
                            {item.meanings && item.meanings.length > 1 && (
                                <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1 rounded-full ml-0.5 shrink-0" title={item.meanings.slice(1).join(', ')}>
                                    +{item.meanings.length - 1}
                                </span>
                            )}
                            <EditIcon size={10} className="text-gray-400/50 shrink-0 cursor-pointer transition-opacity hover:opacity-100" />
                        </span>
                    )}
                </div>
            </div>


            {/* ── DESKTOP ROW (>= 640px ONLY) ── */}
            <div className="hidden sm:flex items-center w-full">
                {/* Term */}
                <div className="w-[25%] flex flex-col justify-center pr-2">
                    <div className="flex items-center text-base font-black text-gray-800 break-words whitespace-normal">
                        <input 
                            type="checkbox" 
                            className="mr-3 cursor-pointer shrink-0" 
                            checked={isSelected}
                            onChange={onToggleSelect}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <span className="break-words whitespace-normal">{item.word}</span>
                    </div>
                    <div className="flex ml-6 mt-1 gap-1 items-center">
                        <div className="flex gap-0.5">
                            {[...Array(Math.min(item.stage, 5))].map((_, i) => (
                                <div key={i} className="w-3 h-3 bg-yellow-400 rounded-full shadow-xs border border-yellow-500"></div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-1 ml-2">
                            {item.word_tags && item.word_tags.map((tag: string) => (
                                <span key={tag} className="bg-blue-50 border border-blue-200 text-blue-500 px-1.5 py-px text-[9px] rounded font-extrabold uppercase tracking-wide">
                                    {tag.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Translation */}
                <div
                    className="w-[25%] flex items-center text-gray-700 font-medium text-sm pr-4 cursor-text group/trans"
                    onDoubleClick={onStartEditing}
                >
                    <span className="mr-2 text-lg shrink-0">🇬🇧</span>
                    {isEditing ? (
                        <input
                            autoFocus
                            className="border border-blue-400 rounded px-2 py-1 flex-1 outline-none font-medium"
                            value={editMeaning}
                            onChange={(e) => onSetEditMeaning(e.target.value)}
                            onBlur={onSaveEdit}
                            onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(); }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            className={item.meaning ? 'flex items-center gap-1 min-w-0' : 'italic text-gray-400 cursor-pointer flex items-center gap-1 min-w-0'}
                            onClick={(e) => { e.stopPropagation(); onStartEditing(); }}
                        >
                            <span className="truncate">{item.meaning || 'Add translation...'}</span>
                            {item.meanings && item.meanings.length > 1 && (
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 rounded-full shrink-0" title={item.meanings.slice(1).join(', ')}>
                                    +{item.meanings.length - 1}
                                </span>
                            )}
                            <EditIcon size={12} className="text-gray-400/40 shrink-0 cursor-pointer transition-opacity hover:opacity-100" />
                        </span>
                    )}
                </div>

                {/* Phrase Context */}
                <div className="w-[15%] text-gray-500 text-sm pr-4 italic" title={item.related_phrase_occur || ''}>
                    {item.related_phrase_occur 
                        ? `"... ${item.related_phrase_occur} ..."` 
                        : <span className="text-gray-300">No context available</span>}
                </div>

                {/* Status Widget — Desktop */}
                <div className="w-[35%] flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex border border-gray-200 rounded-full overflow-hidden bg-white shadow-xs hover:shadow-md transition w-full max-w-xs">
                        {[1, 2, 3, 4].map(num => (
                            <div
                                key={num}
                                onClick={() => onUpdateStage(num)}
                                className={`flex-1 flex items-center justify-center text-sm font-extrabold cursor-pointer transition
                                ${item.stage === num ? 'bg-[#3890fc] text-white' : 'text-gray-500 hover:bg-gray-100 border-r border-gray-100'} h-10`}
                            >
                                {num}
                            </div>
                        ))}
                        <div
                            onClick={() => onUpdateStage(5)}
                            className={`flex-1 flex items-center justify-center cursor-pointer border-l border-gray-200 transition h-10 text-sm
                            ${item.stage === 5 ? 'bg-green-400 text-white' : 'text-green-500 hover:bg-green-50'}`}>✔</div>
                        <div
                            onClick={() => onUpdateStage(6)}
                            className={`flex-1 flex items-center justify-center cursor-pointer transition h-10 text-sm text-gray-400 hover:bg-red-50 hover:text-red-500`}>⊘</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
