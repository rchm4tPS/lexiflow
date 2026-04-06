import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useReaderStore } from '../../../store/useReaderStore';
import { Sound, Coin, Check, Stop, UKFlag } from '../../../components/common/Icons';
import { speak } from '../../../utils/speech';
import { openSmallWindow } from '../../../utils/window';
import { LANGUAGES } from '../../../constants/languages';

type Token = {
    id: string;
    text: string;
};

type PhraseRange = string[];

type Word = {
    id: string;
    text: string;
    stage?: number;
    meaning?: string;
    notes?: string;
    word_tags?: string[];
    isPhrase?: boolean;
    range?: PhraseRange;
};

type UpdatePayload = {
    id: string;
    stage: number;
    meaning?: string;
    tags?: string[];
    notes?: string;
};

interface YellowWordViewProps {
    word: Word;
    onUpdateStage: (payload: UpdatePayload) => void;
}

const YellowWordView = ({ word, onUpdateStage }: YellowWordViewProps) => {
    const stage = word.stage || 1;
    const isIgnored = stage === 6;
    const isPhrase = word.isPhrase;

    const { words, isRTL, languageCode, fetchHints, activeWordHints, fetchUserTags, userTags } = useReaderStore(
        useShallow((state) => ({
            words: state.tokens,
            selectedWordId: state.selectedId,
            isRTL: state.isRTL,
            languageCode: state.languageCode,
            fetchHints: state.fetchHints,
            activeWordHints: state.activeWordHints,
            isLoadingHints: state.isLoadingHints,
            userTags: state.userTags,
            fetchUserTags: state.fetchUserTags
        }))
    );

    const contextWords = useMemo(() => {
        if (!word || !word.id) return [];

        if (isPhrase && word.range && word.range.length > 0) {
            const firstIdx = words.findIndex(w => w.id === word.range![0]);
            const lastIdx = words.findIndex(w => w.id === word.range![word.range!.length - 1]);

            if (firstIdx === -1 || lastIdx === -1) return [];

            const start = Math.max(0, firstIdx - 3);
            const end = Math.min(words.length, lastIdx + 4);
            return words.slice(start, end);
        }

        const idx = words.findIndex(w => w.id === word.id);
        if (idx === -1) return [];
        return words.slice(Math.max(0, idx - 3), idx + 4);
    }, [word, words, isPhrase]);

    const bgTheme = isPhrase ? 'bg-orange-50 border-orange-100' : 'bg-[#fdfaf2] border-yellow-100';
    const highlightTheme = isPhrase ? 'bg-orange-500' : 'bg-[#fde05f]';

    const [tags, setTags] = useState<string[]>(() => word.word_tags || []);
    const [tagInput, setTagInput] = useState("");
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [showPopular, setShowPopular] = useState(false);
    const [showDicts, setShowDicts] = useState(false);
    const [noteVal, setNoteVal] = useState(word.notes || "");

    const handleMeaningChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateStage({
            id: word.id,
            stage,
            meaning: e.target.value,
            tags,
            notes: noteVal
        });
    };


    const cleanWord = word.text
        .replace(/[.,?!„”":;/]/g, '')
        .replace(/(?<!\p{L})'|'(?!\p{L})/gu, '');

    useEffect(() => {
        if (word.text) {
            speak(word.text, languageCode);
        }
    }, [word.id, word.text, languageCode]);

    useEffect(() => {
        if (!isPhrase && cleanWord && cleanWord.split(' ').length === 1) {
            fetchHints(cleanWord);
        }
    }, [cleanWord, isPhrase, fetchHints]);


    useEffect(() => {
        if (userTags.length === 0) fetchUserTags();
    }, [fetchUserTags, userTags.length]);

    const filteredTags = userTags.filter(t => t.includes(tagInput) && t !== tagInput && !tags.includes(t));

    const handleAddTag = (newTag: string) => {
        const formatted = newTag.toLowerCase().replace(/\s+/g, '_');
        if (formatted && !tags.includes(formatted)) {
            const updatedTags = [...tags, formatted];
            setTags(updatedTags);
            setTagInput("");
            setShowTagDropdown(false);
            onUpdateStage({
                id: word.id,
                stage,
                meaning: word.meaning,
                tags: updatedTags,
                notes: noteVal
            });
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const updatedTags = tags.filter(t => t !== tagToRemove);
        setTags(updatedTags);
        onUpdateStage({
            id: word.id,
            stage,
            meaning: word.meaning,
            tags: updatedTags,
            notes: noteVal
        });
    };

    return (
        <div className={`grow shadow-[0_2px_10px_rgba(0,0,0,0.08)] animate-fade-in flex flex-col rounded-xl p-8 m-2 border transition-colors overflow-auto ${isIgnored ? 'bg-gray-100 border-gray-200' : bgTheme}`}>
            <div className="flex items-start mb-4">
                <button
                    className="w-10 h-10 bg-[#5ad263] rounded-full flex items-center justify-center shadow-md mr-4 hover:bg-green-500 transition cursor-pointer"
                    onClick={() => speak(word.text, languageCode)}
                >
                    <Sound />
                </button>
                <div>
                    <h2 className={`${isRTL ? 'font-farsi' : 'font-nunito'} text-3xl text-[#3a92fb] font-bold tracking-tight`}>{word.text}</h2>
                    <div className="flex mt-1">
                        <Coin /><Coin /><Coin /><Coin />
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap mb-5 gap-2 items-center w-max">
                {tags.map(t => (
                    <div key={t} className="group relative flex items-center bg-blue-50 border border-blue-200 text-blue-600 px-2 py-0.5 rounded text-xs font-bold transition">
                        <span>{t.replace(/_/g, ' ')}</span>
                        <button
                            onClick={() => handleRemoveTag(t)}
                            className="ml-1.5 w-3.5 h-3.5 absolute -top-2 -left-3 rounded-full text-blue-400 hover:bg-blue-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                            ×
                        </button>
                    </div>
                ))}

                <div className="relative">
                    <div className="flex items-center bg-white border border-gray-200 rounded px-2 focus-within:border-blue-400 focus-within:ring-1 ring-blue-200 transition">
                        <span className="text-gray-300 text-xs font-bold mr-1">+</span>
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                            onFocus={() => setShowTagDropdown(true)}
                            onBlur={() => setTimeout(() => setShowTagDropdown(false), 150)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddTag(tagInput);
                            }}
                            placeholder="Add tag..."
                            className="text-xs font-bold text-gray-600 outline-none py-1 w-20 placeholder-gray-400 bg-transparent"
                        />
                    </div>

                    {showTagDropdown && filteredTags.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 shadow-lg rounded-md z-50 max-h-32 overflow-y-auto">
                            {filteredTags.map(tag => (
                                <div
                                    key={tag}
                                    onMouseDown={() => handleAddTag(tag)}
                                    className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                                >
                                    {tag.replace(/_/g, ' ')}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={`bg-white border rounded-md p-2 flex items-center shadow-sm mb-3 ${isIgnored ? 'opacity-50 border-gray-400' : 'border-yellow-300'}`}>
                <UKFlag />
                <input
                    type="text"
                    value={word.meaning || ""}
                    onChange={handleMeaningChange}
                    disabled={isIgnored}
                    className="flex-1 outline-none text-gray-800 font-medium ml-2 text-[15px]"
                    placeholder='Type in the meaning of the word here'
                />
                {!isIgnored && <div className="w-6 h-6 bg-[#fde05f] rounded-full flex items-center justify-center text-yellow-800 cursor-pointer shadow-sm hover:bg-yellow-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>}
            </div>

            <div className="flex justify-between items-center text-[#3a92fb] text-sm font-bold mb-4 px-1 cursor-pointer">
                <span className="hover:underline" onClick={() => setShowDicts(!showDicts)}>Check/Manage dictionaries</span>
                {!isPhrase && <span className="hover:underline" onClick={() => setShowPopular(!showPopular)}>Popular meanings</span>}
            </div>

            {showPopular && !isPhrase && activeWordHints.length > 0 && (
                <div className="space-y-2 mb-4">
                    {activeWordHints.slice(0, 3).map((m, idx) => (
                        <div
                            key={idx}
                            onClick={() => onUpdateStage({ id: word.id, stage, meaning: m.text, tags, notes: noteVal })}
                            className="bg-[#3a92fb] text-white px-3 py-2 rounded-md cursor-pointer flex justify-between gap-2 items-center shadow-sm hover:bg-blue-600 transition"
                        >
                            <span className="font-bold text-sm">{m.text}</span>
                            <span className="text-blue-100 text-xs font-bold">({m.popularity})</span>
                        </div>
                    ))}
                </div>
            )}

            {showDicts && (
                <div className="grid grid-cols-1 gap-2 mb-4">
                    <button
                        className="flex w-full items-center bg-white border border-yellow-200 rounded-md p-3 cursor-pointer shadow-sm hover:border-yellow-400 hover:bg-yellow-50 transition"
                        onClick={() => openSmallWindow(`https://translate.google.com/?sl=${languageCode || 'auto'}&tl=en&text=${encodeURIComponent(cleanWord)}&op=translate`)}
                    >
                        <span className="font-bold text-[#3890fc] text-lg mr-3 px-1">G</span>
                        <span className="font-bold text-gray-700 text-sm">Translate {isPhrase ? 'phrase' : 'word'} (Google)</span>
                    </button>
                    <button
                        className="flex w-full items-center bg-white border border-yellow-200 rounded-md p-3 cursor-pointer shadow-sm hover:border-yellow-400 hover:bg-yellow-50 transition"
                        onClick={() => openSmallWindow(`https://en.wiktionary.org/wiki/${encodeURIComponent(cleanWord)}#${LANGUAGES.find(lang => lang.code === languageCode)?.name}`)}
                    >
                        <span className="font-bold text-[#3890fc] text-lg mr-3 px-1">W</span>
                        <span className="font-bold text-gray-700 text-sm">Look up at Wiktionary</span>
                    </button>
                </div>
            )}

            <textarea
                className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm text-gray-600 outline-none focus:border-[#3a92fb] resize-y mb-4 shadow-sm min-h-[4.5rem]"
                placeholder="Enter note"
                rows={3}
                value={noteVal}
                onChange={(e) => setNoteVal(e.target.value)}
                onBlur={() => {
                    if (noteVal !== (word.notes || "")) {
                        onUpdateStage({ id: word.id, stage, meaning: word.meaning, tags, notes: noteVal });
                    }
                }}
            ></textarea>

            <div className="flex justify-center mb-6">
                <div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden bg-white">
                    {[1, 2, 3, 4].map((num) => (
                        <button
                            key={num}
                            onClick={() => onUpdateStage({ id: word.id, stage: num, meaning: word.meaning, tags, notes: noteVal })}
                            className={`w-10 h-8 font-bold text-sm flex items-center justify-center border-r border-gray-100 last:border-0 
                                ${stage === num ? `${highlightTheme} text-white` : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={() => onUpdateStage({ id: word.id, stage: 5, meaning: word.meaning, tags, notes: noteVal })}
                        className={`w-10 h-8 flex items-center justify-center border-l border-gray-200 transition-colors
                            ${stage === 5 ? 'bg-[#4ac9c5] text-white' : 'text-[#3a92fb] hover:bg-blue-50'}`}
                    >
                        <Check />
                    </button>
                    {!isPhrase && (
                        <button
                            onClick={() => onUpdateStage({ id: word.id, stage: 6, meaning: word.meaning, tags, notes: noteVal })}
                            className={`w-10 h-8 flex items-center justify-center transition-colors
                            ${stage === 6 ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                        >
                            <Stop />
                        </button>
                    )}
                </div>
            </div>

            <div className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest mb-6">
                {isIgnored ? "Word Ignored" : `Learning Stage ${stage}`}
            </div>

            {isPhrase && (
                <div className="mx-2 mt-2 p-2 rounded border border-blue-100 bg-blue-50 text-blue-800 text-xs font-semibold">
                    Clicked term is in phrase; tap words to view token details.
                </div>
            )}

            <div className="border-t-2 border-b-2 border-[#FBECA6] py-3 my-3 cursor-pointer group">
                <div className="flex justify-between items-center text-gray-700 font-bold text-sm mb-2">
                    <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-400 transform transition-transform group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        Original Context
                    </div>
                </div>

                <p className="text-[15px] text-gray-600 leading-relaxed font-medium italic px-2">
                    ... {contextWords.map((w: Token) => {
                        const isPhraseToken = isPhrase && word?.range?.includes(w.id);
                        const isWordToken = !isPhrase && w.id === word?.id;
                        return (
                            <span key={w.id} className={isPhraseToken || isWordToken ? "font-bold text-gray-900 underline" : ""}>
                                {w.text}{" "}
                            </span>
                        );
                    })} ...
                </p>
            </div>

            <div className="py-3 cursor-pointer group flex items-center text-gray-700 font-bold text-sm">
                <svg className="w-4 h-4 mr-2 text-gray-400 transform -rotate-90 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                Ask a Tutor
            </div>
        </div>
    );
};

export default YellowWordView;
