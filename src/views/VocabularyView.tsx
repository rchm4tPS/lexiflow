import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { apiClient } from '../api/client';
import { useReaderStore } from '../store/useReaderStore';
import { useAuthStore } from '../store/useAuthStore';
import VocabToolbar from '../features/vocabulary/components/VocabToolbar';
import VocabTable from '../features/vocabulary/components/VocabTable';

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

export default function VocabularyView() {
    const { languageCode, recalculateStats, syncTokenStage, syncPhraseStage, initializeUserState } = useReaderStore();
    
    const location = useLocation();

    const pathParts = location.pathname.split('/');
    const [activeTab, setActiveTab] = useState<'Words' | 'Phrases'>(pathParts[4] === 'phrases' ? 'Phrases' : 'Words');

    const [items, setItems] = useState<VocabItem[]>([]);
    const [total, setTotal] = useState(0);
    const [wordsTotal, setWordsTotal] = useState(0);
    const [phrasesTotal, setPhrasesTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const [limit, setLimit] = useState(25);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState<string>('alphabetical_asc');
    
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editMeaning, setEditMeaning] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setPage(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchInput]);

    const fetchData = async () => {
        if (!languageCode) return;
        setIsLoading(true);
        try {
            const endpoint = activeTab === 'Words' ? '/vocab/list' : '/phrases/list';
            const url = `${endpoint}?lang=${languageCode}&page=${page}&limit=${limit}&sortBy=${sortBy}&search=${encodeURIComponent(debouncedSearch)}`;
            const result = await apiClient(url);
            
            // Map incoming data to ensure 'meaning' property exists and include context phrases
            const mappedData = (result.data || []).map((it: {
                id: string;
                word?: string;
                phrase_text?: string;
                stage: number;
                meaning?: string;
                user_meaning?: string;
                word_tags?: string[];
                phrase_tags?: string;
                notes?: string;
                related_phrase_occur?: string | null;
                meanings?: string[] | string | null;
            }) => {
                // Parse meanings JSON if it comes as a string from the backend
                let parsedMeanings: string[] | null | undefined;
                if (Array.isArray(it.meanings)) {
                    parsedMeanings = it.meanings;
                } else if (typeof it.meanings === 'string') {
                    try { parsedMeanings = JSON.parse(it.meanings); } catch { parsedMeanings = undefined; }
                } else {
                    parsedMeanings = undefined;
                }
                return {
                    id: it.id,
                    word: it.word || it.phrase_text || '',
                    meaning: it.user_meaning || it.meaning || null,
                    meanings: parsedMeanings,
                    stage: it.stage as 1 | 2 | 3 | 4 | 5 | 6,
                    word_tags: it.word_tags || (it.phrase_tags ? it.phrase_tags.split(',') : []),
                    related_phrase_occur: it.related_phrase_occur || null,
                    notes: it.notes || ''
                };
            });

            setItems(mappedData);
            setTotal(result.total || 0);

            if (activeTab === 'Words') {
                setWordsTotal(result.total || 0);
                // Fetch phrases total for badge when on Words tab
                apiClient(`/phrases/list?lang=${languageCode}&limit=1`)
                    .then(res => setPhrasesTotal(res.total || 0))
                    .catch(() => {});
            } else {
                setPhrasesTotal(result.total || 0);
                // Fetch words total for badge when on Phrases tab
                apiClient(`/vocab/list?lang=${languageCode}&limit=1`)
                    .then(res => setWordsTotal(res.total || 0))
                    .catch(() => {});
            }
        } catch (err) {
            console.error(err);
        } finally {
            setTimeout(() => setIsLoading(false), 250);
        }
    };

    useEffect(() => {
        fetchData();
        setSelectedIds([]); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, page, limit, sortBy, debouncedSearch, languageCode]);

    const toggleSelectAll = () => {
        if (selectedIds.length === items.length && items.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map(i => i.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleDelete = async () => {
        if (!selectedIds.length) return;
        const endpoint = activeTab === 'Words' ? '/vocab' : '/phrases';
        const languageCode = useReaderStore.getState().languageCode;
        try {
            await apiClient(endpoint, {
                method: 'DELETE',
                body: JSON.stringify({ ids: selectedIds, languageCode })
            });
            setSelectedIds([]);
            fetchData();
            if (activeTab === 'Words') {
                await recalculateStats();
            }
            // Refresh daily stats (totalDailyLingqs, totalDailyLingqsLearned, etc.)
            // so Daily Goal Widget shows up-to-date values without requiring a hard refresh
            const userId = useAuthStore.getState().user?.id;
            if (userId && languageCode) {
                await initializeUserState(userId, languageCode);
            }
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    const handleUpdateStage = async (item: VocabItem, newStage: number) => {
        const oldStage = Number(item.stage) || 0;
        let lingqDelta = 0;
        if (oldStage === 0 && (newStage >= 1 && newStage <= 4)) lingqDelta = 1;
        if ((oldStage >= 1 && oldStage <= 4) && newStage === 0) lingqDelta = -1;
        const knownDelta = (oldStage !== 5 && newStage === 5) ? 1 : ((oldStage === 5 && newStage !== 5) ? -1 : 0);

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, stage: newStage as 1 | 2 | 3 | 4 | 5 | 6 } : i));
        
        const { updateDailyStats } = useReaderStore.getState();
        updateDailyStats({ created: lingqDelta, learned: knownDelta });

        try {
            if (activeTab === 'Words') {
                await apiClient('/vocab/upsert', {
                    method: 'POST',
                    body: JSON.stringify({
                        wordText: item.word,
                        stage: newStage,
                        meaning: item.meaning,
                        meanings: item.meanings,
                        languageCode,
                        isIgnoredInitially: false,
                        wordTags: item.word_tags
                    })
                });
            } else {
                await apiClient(`/phrases/${item.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        stage: newStage,
                        user_meaning: item.meaning,
                        meaning: item.meaning,
                        meanings: item.meanings,
                        wordTags: item.word_tags
                    })
                });
            }
            if (activeTab === 'Words') {
                recalculateStats();
                syncTokenStage(item.word, newStage, item.meaning || '');
            } else {
                syncPhraseStage(item.id, newStage, item.meaning || '');
            }
        } catch (err) {
            console.error("Failed to update stage", err);
            fetchData();
        }
    };

    const handleSaveEdit = async (item: VocabItem) => {
        setEditingId(null);
        if (editMeaning === item.meaning) return;

        // Rebuild meanings array with updated primary
        const updatedMeanings = [editMeaning, ...(item.meanings || []).slice(1)].filter(m => m.trim() !== "");

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, meaning: editMeaning, meanings: updatedMeanings } : i));

        try {
            if (activeTab === 'Words') {
                await apiClient('/vocab/upsert', {
                    method: 'POST',
                    body: JSON.stringify({
                        wordText: item.word,
                        stage: item.stage,
                        meaning: editMeaning,
                        meanings: updatedMeanings,
                        languageCode,
                        isIgnoredInitially: false,
                        wordTags: item.word_tags
                    })
                });
            } else {
                await apiClient(`/phrases/${item.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        stage: item.stage,
                        user_meaning: editMeaning,
                        meaning: editMeaning,
                        meanings: updatedMeanings,
                        wordTags: item.word_tags
                    })
                });
            }
            if (activeTab === 'Words') {
                syncTokenStage(item.word, item.stage, editMeaning);
            } else {
                syncPhraseStage(item.id, item.stage, editMeaning);
            }
        } catch (err) {
            console.error("Failed to save edit", err);
            fetchData();
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="flex flex-col w-full bg-white rounded-none sm:rounded-xl xl:rounded-t-none shadow-sm min-h-120 p-0 sm:p-6 pb-24 sm:pb-8 lg:border-t-1 lg:border-gray-200">
            <div className="sticky top-0 z-40 sm:relative w-full bg-white">
                <VocabToolbar 
                    limit={limit} setLimit={setLimit}
                    sortBy={sortBy} setSortBy={setSortBy}
                    searchInput={searchInput} setSearchInput={setSearchInput}
                    page={page} setPage={setPage} totalPages={totalPages}
                    selectedCount={selectedIds.length}
                    onDelete={handleDelete}
                    total={total}
                    wordsTotal={wordsTotal}
                    phrasesTotal={phrasesTotal}
                    activeTab={activeTab}
                    onTabChange={(tab) => { setActiveTab(tab); setPage(1); }}
                    onClearSelection={() => setSelectedIds([])}
                />
            </div>

            <VocabTable 
                items={items}
                isLoading={isLoading}
                total={total}
                selectedIds={selectedIds}
                onToggleSelectAll={toggleSelectAll}
                onToggleSelect={toggleSelect}
                onUpdateStage={handleUpdateStage}
                editingId={editingId}
                editMeaning={editMeaning}
                onStartEditing={(it) => { setEditingId(it.id); setEditMeaning(it.meaning || ''); }}
                onSetEditMeaning={setEditMeaning}
                onSaveEdit={handleSaveEdit}
                onClearSelection={() => setSelectedIds([])}
            />
        </div>
    );
}