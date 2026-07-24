import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useReaderStore } from '../../../store/useReaderStore';
import { Sound, Coin, Check, Stop, UKFlag } from '../../../components/common/Icons';
import { speak } from '../../../utils/speech';
import { openSmallWindow } from '../../../utils/window';
import { LANGUAGES } from '../../../constants/languages';

import type { SidebarItem, UpdatePayload } from '../../../types/reader';

interface BlueWordViewProps {
  word: SidebarItem;
  onUpdateStage: (payload: UpdatePayload) => void;
  onCreatePhrase: (range: string[], meaning: string) => void;
}

const BlueWordView = ({ word, onUpdateStage, onCreatePhrase }: BlueWordViewProps) => {
    const [showDicts, setShowDicts] = useState(false);
    const { isRTL, activeWordHints, isLoadingHints, fetchHints, languageCode, clearSelection } = 
        useReaderStore(useShallow((state) => ({
            isRTL: state.isRTL,
            activeWordHints: state.activeWordHints,
            isLoadingHints: state.isLoadingHints,
            fetchHints: state.fetchHints,
            languageCode: state.languageCode,
            clearSelection: state.clearSelection
        })));

    const cleanWord = (word.text || '')
        .replace(/[.,?!„”":;/]/g, '')
        .replace(/(?<!\p{L})'|'(?!\p{L})/gu, '');

    // Auto-play audio when word changes
    useEffect(() => {
        if (cleanWord) {
            speak(cleanWord, languageCode);
        }
    }, [cleanWord, languageCode]);

    // Fetch hints once when the component mounts or the word changes
    useEffect(() => {
        if (cleanWord) fetchHints(cleanWord);
    }, [cleanWord, fetchHints]);

    // Helper to promote word to learning with a specific meaning
    const handleAddLingQ = (meaning: string) => {
        if (word.isDraft) {
            if (!word.range) return;
            onCreatePhrase(word.range, meaning);
        } else if (word.id) {
            onUpdateStage({
                id: word.id,
                stage: 1,
                meaning
            });
        }
    };

    return (
        <div className={`grow bg-[#eef9ff] animate-fade-in flex flex-col min-h-0 rounded-xl shadow-md xl:shadow-[0_2px_10px_rgba(0,0,0,0.08)] p-3 md:p-4 xl:p-8 m-1 md:m-2 lg:m-4 xl:m-2 border border-gray-100 overflow-y-auto`}>
            <div className="flex flex-col h-fit shrink-0">
                <div className="flex h-fit items-center">
                    <button
                        className="w-8 h-8 md:w-10 md:h-10 px-1.5 md:px-2 bg-[#5ad263] rounded-full flex items-center justify-center shadow-md mr-3 md:mr-4 hover:bg-green-500 transition cursor-pointer"
                        onClick={() => speak(cleanWord, languageCode)} 
                    >
                        <Sound />
                    </button>
                    <div className='overflow-auto'>
                        <h2 className={`${isRTL ? 'font-farsi' : 'font-nunito'} text-2xl md:text-3xl text-[#3a92fb] font-bold tracking-tight hyphens-auto wrap-break-word`} lang={languageCode || 'en'}>{cleanWord}</h2>
                        <div className="flex mt-2">
                            <Coin /><Coin />
                        </div>
                    </div>
                    <button 
                        onClick={() => clearSelection()}
                        className="xl:hidden ml-auto self-start text-gray-400 hover:text-gray-600 transition p-1 cursor-pointer"
                        title="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <button
                    onClick={() => {
                        if (word.isDraft) {
                            onCreatePhrase(word.range || [], "");
                        } else if (word.id) {
                            onUpdateStage({
                                id: word.id,
                                stage: 5,
                                meaning: word.meaning,
                                tags: word.word_tags,
                                notes: word.notes
                            });
                        }
                    }}
                    className="bg-[#4ac9c5] text-white px-2 py-1 ml-auto w-fit rounded font-bold text-xs flex items-center shadow hover:bg-teal-500 transition cursor-pointer relative bottom-5"
                >
                    <Check /> I know this word
                </button>
            </div>

            {/* Toggle Header for Hints vs Dictionaries (Hidden on XL) */}
            <div className="flex xl:hidden justify-between items-center mb-2 shrink-0">
                <p className="text-gray-500 text-sm font-semibold">
                    {showDicts ? 'Search in external dictionaries' : 'Use a popular meaning'}
                </p>
                <span 
                    className="text-[#3a92fb] text-sm font-bold hover:underline cursor-pointer"
                    onClick={() => setShowDicts(!showDicts)}
                >
                    {showDicts ? 'View popular meanings' : 'Search dictionaries choices'}
                </span>
            </div>

            {/* Original Header for Hints (Only visible on XL) */}
            <p className="hidden xl:block text-gray-500 text-sm mb-3 font-semibold shrink-0">
                Use a popular meaning from the community
            </p>

            {/* Popular Meanings (Hints) */}
            <div className={`${showDicts ? 'hidden xl:block' : 'block'} space-y-2 mb-3 xl:mb-6 overflow-y-auto shrink-1 min-h-0`}>
                    {isLoadingHints ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-10 bg-[#3a92fb]/50 rounded-md animate-shimmer w-full" />
                            ))}
                        </div>
                    ) : activeWordHints.length > 0 ? (
                        activeWordHints.slice(0, 3).map((m, idx) => (
                            <div
                                key={idx}
                                onClick={() => {
                                    if (word.id) {
                                        onUpdateStage({
                                            id: word.id,
                                            stage: 1,
                                            meaning: m.text
                                        });
                                    }
                                }}
                                className="bg-[#3a92fb] text-white px-2 py-1.5 lg:py-1.5 lg:px-3 xl:px-4 xl:py-3 rounded-md cursor-pointer flex justify-between items-center shadow-sm hover:bg-[#3a92fb] hover:text-white transition group"
                            >
                                <span className="font-bold">{m.text}</span>
                                <span className="text-gray-200 group-hover:text-white/80 text-sm font-bold">({m.popularity})</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-400 italic text-sm text-center py-4">
                            No popular meanings found. Try a dictionary below.
                        </div>
                    )}
                </div>
            {/* Create meaning link */}
            <div className={`${showDicts ? 'hidden xl:flex' : 'flex'} justify-between items-center text-[#3a92fb] text-sm font-bold mb-3 xl:mb-6 cursor-pointer shrink-0`}>
                    <span className="hover:underline">View more</span>
                    <span
                        className="hover:underline"
                        onClick={() => handleAddLingQ("")}
                    >
                        Or, create your own meaning
                    </span>
                </div>


            {/* External Dictionaries */}
            <div className={`${!showDicts ? 'hidden xl:block' : 'block'} space-y-2 lg:space-y-1.5 xl:space-y-3 overflow-y-auto pr-2 pb-4 shrink-1 min-h-0`}>
                {word.isDraft ? (
                    <>
                        <button
                            className="flex w-full items-center bg-white border border-blue-200 rounded-md p-1.5 lg:py-1.5 lg:px-2 xl:p-3 cursor-pointer shadow-sm hover:border-blue-400 hover:bg-blue-50 transition"
                            onClick={() => {
                                openSmallWindow(`https://translate.google.com/?sl=${languageCode || 'auto'}&tl=en&text=${encodeURIComponent(cleanWord)}&op=translate`);
                                handleAddLingQ("");
                            }}
                        >
                            <span className="font-bold text-[#3890fc] text-lg mr-3 px-1">G</span>
                            <span className="font-bold text-gray-700 text-[15px]">Translate phrase (Google)</span>
                        </button>
                        <button
                            className="flex w-full items-center bg-white border border-blue-200 rounded-md p-1.5 lg:py-1.5 lg:px-2 xl:p-3 cursor-pointer shadow-sm hover:border-blue-400 hover:bg-blue-50 transition"
                            onClick={() => {
                                openSmallWindow(`https://en.wiktionary.org/wiki/${encodeURIComponent(cleanWord)}#${LANGUAGES.find(lang => lang.code === languageCode)?.name}`);
                                handleAddLingQ("");
                            }}
                        >
                            <span className="font-bold text-[#3890fc] text-lg mr-3 px-1">W</span>
                            <span className="font-bold text-gray-700 text-[15px]">Look up at Wiktionary</span>
                        </button>
                    </>
                ) : (
                    ['WordReference', 'DICT.cc', 'Linguee'].map((dict, i) => (
                        <button
                            key={i}
                            className="flex w-full items-center bg-white border border-gray-200 rounded-md p-1.5 lg:py-1.5 lg:px-2 xl:p-3 cursor-pointer shadow-sm hover:border-gray-300 hover:bg-blue-100 transition"
                            onClick={() => openSmallWindow("https://www.wikipedia.com")}
                        >
                            <UKFlag />
                            <span className="font-bold text-gray-700 text-[15px]">Search {dict} (popup)</span>
                        </button>
                    ))
                )}
            </div>

            {!word.isDraft && word.id && (
                <button
                    onClick={() => onUpdateStage({
                        id: word.id!,
                        stage: 6
                    })}
                    className="border cursor-pointer border-gray text-gray-400 hover:text-white ml-auto mr-2 my-2 w-fit px-3 py-1 rounded text-xs font-bold flex items-center gap-2 shadow hover:bg-red-500 hover:border-red-500 transition"
                >
                    <Stop /> Ignore this word
                </button>
            )}
        </div>
    );
};

export default BlueWordView;
