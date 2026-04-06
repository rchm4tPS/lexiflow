import { VocabRowSkeleton } from '../../../components/ui/Skeletons';

type VocabItem = {
  id: string;
  word: string;
  meaning: string | null;
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
}

export default function VocabTable({
    items, isLoading, total, selectedIds,
    onToggleSelectAll, onToggleSelect,
    onUpdateStage, editingId, editMeaning,
    onStartEditing, onSetEditMeaning, onSaveEdit
}: VocabTableProps) {
    
    return (
        <div className="flex flex-col grow">
            {/* Table Header */}
            <div className="flex text-xs font-bold text-gray-400 mb-2 px-4 shadow-sm pb-2 border-b">
                <div className="w-[30%] flex items-center">
                    <input 
                        type="checkbox" 
                        className="mr-2 cursor-pointer" 
                        checked={items.length > 0 && selectedIds.length === items.length}
                        onChange={onToggleSelectAll} 
                    /> 
                    TERM ({total} IN TOTAL)
                </div>
                <div className="w-[30%]">TRANSLATION</div>
                <div className="w-[25%]">CONTEXT PHRASE</div>
                <div className="w-[15%] text-center">STATUS</div>
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
                        onToggleSelect={() => onToggleSelect(item.id)}
                        onUpdateStage={(s: number) => onUpdateStage(item, s)}
                        isEditing={editingId === item.id}
                        editMeaning={editMeaning}
                        onStartEditing={() => onStartEditing(item)}
                        onSetEditMeaning={onSetEditMeaning}
                        onSaveEdit={() => onSaveEdit(item)}
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
    onToggleSelect: () => void;
    onUpdateStage: (stage: number) => void;
    isEditing: boolean;
    editMeaning: string;
    onStartEditing: () => void;
    onSetEditMeaning: (meaning: string) => void;
    onSaveEdit: () => void;
}

function VocabRow({ 
    item, isEven, isSelected, onToggleSelect, 
    onUpdateStage, isEditing, editMeaning, 
    onStartEditing, onSetEditMeaning, onSaveEdit 
}: VocabRowProps) {
    return (
        <div className={`flex items-center py-4 px-4 border-b border-gray-100 ${isEven ? 'bg-[#fffdf5]' : 'bg-white'} hover:bg-blue-50 transition`}>
            {/* Term */}
            <div className="w-[30%] flex flex-col justify-center">
                <div className="flex items-center text-lg font-bold text-gray-800">
                    <input 
                        type="checkbox" 
                        className="mr-3 cursor-pointer" 
                        checked={isSelected}
                        onChange={onToggleSelect}
                    />
                    {item.word}
                </div>
                <div className="flex ml-6 mt-1 gap-1 items-center">
                    <div className="flex gap-0.5">
                        {[...Array(Math.min(item.stage, 5))].map((_, i) => (
                            <div key={i} className="w-3 h-3 bg-yellow-400 rounded-full shadow-sm border border-yellow-500"></div>
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
                className="w-[30%] flex items-center text-gray-700 font-medium text-sm pr-4 cursor-text"
                onDoubleClick={onStartEditing}
            >
                <span className="mr-2 text-lg">🇬🇧</span> 
                {isEditing ? (
                    <input 
                        autoFocus
                        className="border border-blue-400 rounded px-2 py-1 flex-1 outline-none font-medium"
                        value={editMeaning}
                        onChange={(e) => onSetEditMeaning(e.target.value)}
                        onBlur={onSaveEdit}
                        onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(); }}
                    />
                ) : (
                    <span 
                        className={item.meaning ? '' : 'italic text-gray-400 cursor-pointer'}
                        onClick={onStartEditing}
                    >
                        {item.meaning || 'Add translation...'}
                    </span>
                )}
            </div>

            {/* Phrase Context */}
            <div className="w-[25%] text-gray-500 text-sm pr-4 italic" title={item.related_phrase_occur || ''}>
                {item.related_phrase_occur 
                    ? `"... ${item.related_phrase_occur} ..."` 
                    : <span className="text-gray-300">No context available</span>}
            </div>

            {/* Status Widget */}
            <div className="w-[15%] flex justify-center">
                <div className="flex border border-gray-200 rounded-full overflow-hidden bg-white shadow-sm hover:shadow-md transition">
                    {[1, 2, 3, 4].map(num => (
                        <div 
                            key={num} 
                            onClick={() => onUpdateStage(num)}
                            className={`w-6 h-6 flex items-center justify-center text-xs font-bold cursor-pointer transition
                            ${item.stage === num ? 'bg-[#3890fc] text-white' : 'text-gray-500 hover:bg-gray-100 border-r border-gray-100'}`}
                        >
                            {num}
                        </div>
                    ))}
                    <div 
                        onClick={() => onUpdateStage(5)}
                        className={`w-6 h-6 flex items-center justify-center cursor-pointer border-l border-gray-200 transition
                        ${item.stage === 5 ? 'bg-green-400 text-white' : 'text-green-500 hover:bg-green-50'}`}>✔</div>
                    <div 
                        onClick={() => onUpdateStage(6)}
                        className={`w-6 h-6 flex items-center justify-center cursor-pointer transition text-gray-400 hover:bg-red-50 hover:text-red-500`}>⊘</div>
                </div>
            </div>
        </div>
    );
}
