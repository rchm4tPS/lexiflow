
import { useState } from 'react';
import { SlidersHorizontal, Search, X, Trash2 } from 'lucide-react';

interface VocabToolbarProps {
    limit: number;
    setLimit: (limit: number) => void;
    sortBy: string;
    setSortBy: (sortBy: string) => void;
    searchInput: string;
    setSearchInput: (input: string) => void;
    page: number;
    setPage: (page: number) => void;
    totalPages: number;
    selectedCount: number;
    onDelete: () => void;
    total: number;
    wordsTotal?: number;
    phrasesTotal?: number;
    activeTab: 'Words' | 'Phrases';
    onTabChange: (tab: 'Words' | 'Phrases') => void;
    onClearSelection?: () => void;
}

export default function VocabToolbar({
    limit, setLimit,
    sortBy, setSortBy,
    searchInput, setSearchInput,
    page, setPage, totalPages,
    selectedCount, onDelete,
    total: _total, wordsTotal = 0, phrasesTotal = 0, activeTab, onTabChange,
    onClearSelection
}: VocabToolbarProps) {
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="flex flex-col w-full">
            {/* ── DESKTOP TOOLBAR (>= 640px ONLY) — CLEAN WHITE (NO BLUE HEADER!) ── */}
            <div className="hidden sm:flex flex-col gap-4 mb-4 pb-4 border-b border-gray-100">
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
                    {/* Filter Selects & Search */}
                    <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-gray-600 flex-1 min-w-0">
                        <select 
                            className="border border-gray-300 px-3 py-1.5 rounded-lg bg-white shadow-2xs hover:bg-gray-50 outline-none cursor-pointer text-sm"
                            value={limit}
                            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                        >
                            <option value={10}>Show: 10</option>
                            <option value={25}>Show: 25</option>
                            <option value={50}>Show: 50</option>
                            <option value={100}>Show: 100</option>
                        </select>

                        <select 
                            className="border border-gray-300 px-3 py-1.5 rounded-lg bg-white shadow-2xs hover:bg-gray-50 outline-none cursor-pointer text-sm"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="alphabetical_asc">Term (A-Z)</option>
                            <option value="alphabetical_desc">Term (Z-A)</option>
                            <option value="last_reviewed_desc">Newest</option>
                            <option value="last_reviewed_asc">Oldest</option>
                            <option value="stage_asc">Stage (Low to High)</option>
                            <option value="stage_desc">Stage (High to Low)</option>
                        </select>

                        <div className="relative min-w-[160px] flex-1 max-w-[240px]">
                            <input 
                                type="text" 
                                placeholder="Search" 
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-[#3890fc] font-medium text-sm shadow-2xs" 
                            />
                            <span className="absolute right-2.5 top-2 text-xs text-gray-400 pointer-events-none">🔍</span>
                        </div>
                    </div>

                    {/* Pagination + Delete / Batalkan Buttons */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 shrink-0 whitespace-nowrap">
                            <button 
                                disabled={page <= 1} 
                                onClick={() => setPage(page - 1)} 
                                className="px-2.5 py-1 border border-gray-200 rounded-md disabled:opacity-40 font-extrabold bg-white hover:bg-gray-50 cursor-pointer shadow-2xs"
                            >
                                &lt;
                            </button>
                            <span className="text-gray-500 font-semibold px-1 whitespace-nowrap">
                                {page} / {Math.max(1, totalPages)}
                            </span>
                            <button 
                                disabled={page >= totalPages} 
                                onClick={() => setPage(page + 1)} 
                                className="px-2.5 py-1 border border-gray-200 rounded-md disabled:opacity-40 font-extrabold bg-white hover:bg-gray-50 cursor-pointer shadow-2xs"
                            >
                                &gt;
                            </button>
                        </div>

                        {selectedCount > 0 && (
                            <>
                                <button 
                                    onClick={onDelete} 
                                    className="bg-red-500 text-white px-4 py-1.5 rounded-full font-bold shadow-sm hover:bg-red-600 text-xs cursor-pointer transition-colors"
                                >
                                    Delete ({selectedCount})
                                </button>
                                {onClearSelection && (
                                    <button 
                                        onClick={onClearSelection} 
                                        className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-full font-bold shadow-2xs hover:bg-gray-300 text-xs cursor-pointer transition-colors"
                                    >
                                        Batalkan Pilihan ({selectedCount})
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Sub-tabs Row (Desktop Classic) */}
                <div className="flex items-center gap-6 text-sm font-bold border-b border-gray-200 pt-2">
                    <button 
                        onClick={() => onTabChange('Words')}
                        className={`pb-2.5 border-b-2 transition-all cursor-pointer ${activeTab === 'Words' ? 'border-[#3890fc] text-[#3890fc] font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                    >
                        Words ({wordsTotal})
                    </button>
                    <button 
                        onClick={() => onTabChange('Phrases')}
                        className={`pb-2.5 border-b-2 transition-all cursor-pointer ${activeTab === 'Phrases' ? 'border-[#3890fc] text-[#3890fc] font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                    >
                        Phrases ({phrasesTotal})
                    </button>
                    <button 
                        className="pb-2.5 border-b-2 border-transparent text-gray-400 opacity-60 cursor-default"
                    >
                        SRS Due (0)
                    </button>
                </div>
            </div>


            {/* ── MOBILE TOOLBAR (< 640px ONLY) — STICKY BLUE HEADER ── */}
            <div className="sm:hidden flex flex-col w-full">
                <div className="bg-[#3890fc] px-4 pt-3 pb-2 text-white flex flex-col gap-2 rounded-none sm:rounded-t-xl shadow-sm">
                    {/* Search Bar with Settings/Filter Icon */}
                    <div className="relative w-full">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <Search size={16} />
                        </span>
                        <input 
                            type="text" 
                            placeholder="Search" 
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full bg-white text-gray-800 rounded-md pl-9 pr-10 py-1.5 text-xs font-medium outline-none shadow-inner" 
                        />
                        <button
                            type="button"
                            onClick={() => setShowFilters(prev => !prev)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-blue-600/30 transition-colors cursor-pointer ${showFilters ? 'text-amber-300' : 'text-[#3890fc] hover:text-blue-700'}`}
                            title="Filter Settings"
                        >
                            <SlidersHorizontal size={18} />
                        </button>
                    </div>

                    {/* Expandable Filter Panel */}
                    {showFilters && (
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 flex items-center justify-between gap-2 text-xs font-bold animate-in fade-in duration-150 max-w-full overflow-hidden">
                            <div className="flex items-center gap-1 shrink-0">
                                <span className="text-blue-100 text-[11px]">Show:</span>
                                <select 
                                    className="bg-white text-gray-800 px-1.5 py-1 rounded outline-none text-xs w-16 cursor-pointer"
                                    value={limit}
                                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                                <span className="text-blue-100 text-[11px] shrink-0">Sort:</span>
                                <select 
                                    className="bg-white text-gray-800 px-1.5 py-1 rounded outline-none text-xs w-full min-w-0 truncate cursor-pointer"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="alphabetical_asc">Term (A-Z)</option>
                                    <option value="alphabetical_desc">Term (Z-A)</option>
                                    <option value="last_reviewed_desc">Newest</option>
                                    <option value="last_reviewed_asc">Oldest</option>
                                    <option value="stage_asc">Stage (Low to High)</option>
                                    <option value="stage_desc">Stage (High to Low)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Sub-tabs Row (Equal width grid-cols-3 spread evenly across 100% mobile width) */}
                    <div className="grid grid-cols-3 w-full text-center text-xs font-bold pt-1">
                        <button 
                            onClick={() => onTabChange('Words')}
                            className={`pb-1.5 border-b-2 transition-all cursor-pointer text-center justify-center flex items-center ${activeTab === 'Words' ? 'border-amber-400 text-white font-extrabold' : 'border-transparent text-blue-100 hover:text-white'}`}
                        >
                            Words ({wordsTotal})
                        </button>
                        <button 
                            onClick={() => onTabChange('Phrases')}
                            className={`pb-1.5 border-b-2 transition-all cursor-pointer text-center justify-center flex items-center ${activeTab === 'Phrases' ? 'border-amber-400 text-white font-extrabold' : 'border-transparent text-blue-100 hover:text-white'}`}
                        >
                            Phrases ({phrasesTotal})
                        </button>
                        <button 
                            className="pb-1.5 border-b-2 border-transparent text-blue-100/70 opacity-80 cursor-default text-center justify-center flex items-center"
                        >
                            SRS Due (0)
                        </button>
                    </div>
                </div>

                {/* Mobile Bottom Actions: Pagination (Left) & Delete + Batalkan (Right) — NO REVIEW BUTTON! */}
                <div className="px-5 pt-3 pb-2 flex items-center justify-between gap-2 bg-white">
                    {/* Pagination Controls */}
                    <div className="flex items-center gap-1 text-xs font-bold text-gray-600">
                        <button 
                            disabled={page <= 1} 
                            onClick={() => setPage(page - 1)} 
                            className="px-2 py-1 border border-gray-200 rounded-md disabled:opacity-40 font-extrabold bg-white hover:bg-gray-50 cursor-pointer shadow-2xs"
                        >
                            &lt;
                        </button>
                        <span className="text-gray-500 font-semibold px-1 text-[11px]">
                            Page {page} of {Math.max(1, totalPages)}
                        </span>
                        <button 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(page + 1)} 
                            className="px-2 py-1 border border-gray-200 rounded-md disabled:opacity-40 font-extrabold bg-white hover:bg-gray-50 cursor-pointer shadow-2xs"
                        >
                            &gt;
                        </button>
                    </div>

                    {/* Delete Icon + Batalkan (NO REVIEW BUTTON AT ALL!) */}
                    <div className="flex items-center gap-2">
                        {selectedCount > 0 && (
                            <>
                                <button 
                                    onClick={onDelete} 
                                    className="bg-red-500 text-white px-3 py-1 rounded-full font-bold shadow-xs hover:bg-red-600 text-xs cursor-pointer transition-colors flex items-center gap-1"
                                    title={`Delete ${selectedCount} selected items`}
                                >
                                    <Trash2 size={13} /> ({selectedCount})
                                </button>
                                {onClearSelection && (
                                    <button 
                                        onClick={onClearSelection} 
                                        className="bg-amber-500 text-white px-3 py-1 rounded-full font-bold shadow-xs hover:bg-amber-600 text-xs cursor-pointer transition-colors flex items-center gap-1"
                                    >
                                        <X size={13} /> Batalkan
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
