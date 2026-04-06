import { useEffect } from 'react';
import { useReaderStore } from '../../../store/useReaderStore';
import { Sound, Coin, Check, Stop, UKFlag } from '../../../components/common/Icons';
import { speak } from '../../../utils/speech';
import { openSmallWindow } from '../../../utils/window';
import { LANGUAGES } from '../../../constants/languages';

const BlueWordView = ({ word, onUpdateStage, onCreatePhrase }: any) => {
    const { isRTL, activeWordHints, isLoadingHints, fetchHints, languageCode } = useReaderStore();

    const cleanWord = word.text
        .replace(/[.,?!„”":;/]/g, '')
        .replace(/(?<!\p{L})'|'(?!\p{L})/gu, '');

    // Auto-play audio when word changes
    useEffect(() => {
        if (cleanWord) {
            speak(cleanWord, languageCode);
        }
    }, [word.id, cleanWord, languageCode]);

    // Fetch hints once when the component mounts or the word changes
    useEffect(() => {
        if (cleanWord && cleanWord.split(' ').length === 1) fetchHints(cleanWord);
    }, [cleanWord, fetchHints]);

    // Helper to promote word to learning with a specific meaning
    const handleAddLingQ = (meaning: string) => {
        if (word.isDraft) {
            onCreatePhrase(word.range, meaning);
        } else {
            onUpdateStage(word.id, 1, meaning);
        }
    };

    return (
        <div className={`grow bg-[#eef9ff] animate-fade-in flex flex-col rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] p-8 m-2 border border-gray-100 overflow-auto`}>
            <div className="flex flex-col h-fit">
                <div className="flex h-fit items-center">
                    <button
                        className="w-10 h-10 px-2 bg-[#5ad263] rounded-full flex items-center justify-center shadow-md mr-4 hover:bg-green-500 transition cursor-pointer"
                        onClick={() => speak(cleanWord, languageCode)} 
                    >
                        <Sound />
                    </button>
                    <div className='overflow-auto'>
                        <h2 className={`${isRTL ? 'font-farsi' : 'font-nunito'} text-3xl text-[#3a92fb] font-bold tracking-tight hyphens-auto wrap-break-word`} lang={isRTL ? 'fa' : 'en'}>{cleanWord}</h2>
                        <div className="flex mt-2">
                            <Coin /><Coin />
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (word.isDraft) {
                            onCreatePhrase(word.range, "");
                        } else {
                            onUpdateStage(word.id, 5, word.meaning, word.word_tags, word.notes);
                        }
                    }}
                    className="bg-[#4ac9c5] text-white px-2 py-1 ml-auto w-fit rounded font-bold text-xs flex items-center shadow hover:bg-teal-500 transition cursor-pointer relative bottom-5"
                >
                    <Check /> I know this word
                </button>
            </div>

            {!word.isDraft && (
                <>
                    <p className="text-gray-500 text-sm mb-3 font-semibold">Use a popular meaning from the community</p>
                    <div className="space-y-2 mb-6 overflow-auto max-h-60">
                        {isLoadingHints ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-12 bg-[#3a92fb]/50 rounded-md animate-shimmer w-full" />
                                ))}
                            </div>
                        ) : activeWordHints.length > 0 ? (
                            activeWordHints.map((m, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => onUpdateStage(word.id, 1, m.text)}
                                    className="bg-[#3a92fb] text-white px-4 py-3 rounded-md cursor-pointer flex justify-between items-center shadow-sm hover:bg-[#3a92fb] hover:text-white transition group"
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
                </>
            )}

            <div className="flex justify-between items-center text-[#3a92fb] text-sm font-bold mb-6 cursor-pointer">
                <span className="hover:underline">View more</span>
                <span
                    className="hover:underline"
                    onClick={() => handleAddLingQ("")}
                >
                    Or, create your own meaning
                </span>
            </div>

            {/* External Dictionaries */}
            <div className="space-y-3 overflow-y-auto pr-2 pb-4">
                {word.isDraft ? (
                    <>
                        <button
                            className="flex w-full items-center bg-white border border-blue-200 rounded-md p-3 cursor-pointer shadow-sm hover:border-blue-400 hover:bg-blue-50 transition"
                            onClick={() => {
                                openSmallWindow(`https://translate.google.com/?sl=${languageCode || 'auto'}&tl=en&text=${encodeURIComponent(cleanWord)}&op=translate`);
                                handleAddLingQ("");
                            }}
                        >
                            <span className="font-bold text-[#3890fc] text-lg mr-3 px-1">G</span>
                            <span className="font-bold text-gray-700 text-[15px]">Translate phrase (Google)</span>
                        </button>
                        <button
                            className="flex w-full items-center bg-white border border-blue-200 rounded-md p-3 cursor-pointer shadow-sm hover:border-blue-400 hover:bg-blue-50 transition"
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
                            className="flex w-full items-center bg-white border border-gray-200 rounded-md p-3 cursor-pointer shadow-sm hover:border-gray-300 hover:bg-blue-100 transition"
                            onClick={() => openSmallWindow("https://www.wikipedia.com")}
                        >
                            <UKFlag />
                            <span className="font-bold text-gray-700 text-[15px]">Search {dict} (popup)</span>
                        </button>
                    ))
                )}
            </div>

            {!word.isDraft && (
                <button
                    onClick={() => onUpdateStage(word.id, 6)}
                    className="border cursor-pointer border-gray text-gray-400 hover:text-white ml-auto mr-2 my-2 w-fit px-3 py-1 rounded text-xs font-bold flex items-center gap-2 shadow hover:bg-red-500 hover:border-red-500 transition"
                >
                    <Stop /> Ignore this word
                </button>
            )}
        </div>
    );
};

export default BlueWordView;
