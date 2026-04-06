
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
}

export default function VocabToolbar({
    limit, setLimit,
    sortBy, setSortBy,
    searchInput, setSearchInput,
    page, setPage, totalPages,
    selectedCount, onDelete
}: VocabToolbarProps) {
    return (
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                <select 
                    className="border px-3 py-1 rounded hover:bg-gray-50 outline-none cursor-pointer"
                    value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                >
                    <option value={10}>Show: 10</option>
                    <option value={25}>Show: 25</option>
                    <option value={50}>Show: 50</option>
                    <option value={100}>Show: 100</option>
                </select>

                <select 
                    className="border px-3 py-1 rounded hover:bg-gray-50 outline-none cursor-pointer"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="alphabetical_asc">Term (A-Z)</option>
                    <option value="alphabetical_desc">Term (Z-A)</option>
                    <option value="last_reviewed_desc">Newest (Last Reviewed)</option>
                    <option value="last_reviewed_asc">Oldest (Last Reviewed)</option>
                    <option value="stage_asc">Stage (Low to High)</option>
                    <option value="stage_desc">Stage (High to Low)</option>
                </select>

                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search" 
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="border rounded pl-3 pr-8 py-1 focus:outline-blue-400 font-medium" 
                    />
                    <span className="absolute right-2 top-1 opacity-50">🔍</span>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-2 ml-4">
                        <button disabled={page === 1} onClick={() => setPage(page-1)} className="px-2 py-1 border rounded disabled:opacity-50">{"<"}</button>
                        <span>Page {page} of {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => setPage(page+1)} className="px-2 py-1 border rounded disabled:opacity-50">{">"}</button>
                    </div>
                )}
            </div>

            {selectedCount > 0 ? (
                <div className="flex gap-3">
                    <button onClick={onDelete} className="bg-red-500 text-white px-8 py-2 rounded-full font-bold shadow-md hover:bg-red-600 text-sm">
                        Delete ({selectedCount})
                    </button>
                </div>
            ) : (
                <button className="bg-[#fcb817] text-white px-8 py-2 rounded-full font-bold shadow-md hover:bg-yellow-500 text-sm">
                    Review
                </button>
            )}
        </div>
    );
}
