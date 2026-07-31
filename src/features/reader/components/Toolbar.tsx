import { useState, useRef, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useReaderStore } from '../../../store/useReaderStore';
import { Play, Pause, Square } from 'lucide-react';

export default function Toolbar() {
    const { tokens, phrases, handlePageAdvance, currentPage, showSummary, isRTL, lessonAudio, incrementListeningTicks, totalPages, columnMapping, readerMode, sentenceAudioTrigger } = useReaderStore(useShallow(state => ({
        tokens: state.tokens, phrases: state.phrases, handlePageAdvance: state.handlePageAdvance,
        currentPage: state.currentPage, showSummary: state.showSummary, isRTL: state.isRTL,
        lessonAudio: state.lessonAudio, incrementListeningTicks: state.incrementListeningTicks,
        totalPages: state.totalPages, columnMapping: state.columnMapping,
        readerMode: state.readerMode, sentenceAudioTrigger: state.sentenceAudioTrigger
    })));
    
    const reviewCount = useMemo(() => {
        // Count of unique LingQs (stage 1, 2, 3, 4) in the lesson
        const uniqueLingQs = new Set(
            tokens
                .filter(w => w.isLearnable && (w.stage ?? 0) >= 1 && (w.stage ?? 0) <= 4)
                .map(w => w.text.toLowerCase())
        );
        const uniquePhrases = new Set(
            phrases
                .filter(p => (p.stage ?? 0) >= 1 && (p.stage ?? 0) <= 4)
                .map(p => p.text.toLowerCase())
        );
        return uniqueLingQs.size + uniquePhrases.size;
    }, [tokens, phrases]);

    const audioRef = useRef<HTMLAudioElement>(null);
    const stopAtTimeRef = useRef<number | null>(null);
    const lastTriggerIdRef = useRef<number | null>(useReaderStore.getState().sentenceAudioTrigger?.id ?? null);
    const [audioState, setAudioState] = useState<'stopped' | 'playing' | 'paused'>('stopped');
    const [playbackRate, setPlaybackRate] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (audioState === 'playing') {
            interval = setInterval(() => {
                incrementListeningTicks(playbackRate);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [audioState, incrementListeningTicks, playbackRate]);

    // Clear bounded playback when returning to paragraph / normal view
    useEffect(() => {
        if (readerMode === 'paragraph') {
            stopAtTimeRef.current = null;
            useReaderStore.getState().setPlayingSentenceIndex(null);
        }
    }, [readerMode]);

    // Handle Sentence Audio Play Triggers from Sentence View
    useEffect(() => {
        if (!sentenceAudioTrigger || sentenceAudioTrigger.id === lastTriggerIdRef.current) return;
        lastTriggerIdRef.current = sentenceAudioTrigger.id;

        const { sentenceIndex, action } = sentenceAudioTrigger;
        if (action === 'stop' || sentenceIndex === -1) {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setAudioState('stopped');
            stopAtTimeRef.current = null;
            useReaderStore.getState().setIsAudioPlaying(false);
            useReaderStore.getState().setPlayingSentenceIndex(null);
            return;
        }

        if (!audioRef.current || !lessonAudio) return;

        const { audioTimestamps, playingSentenceIndex } = useReaderStore.getState();

        // Toggle pause if clicking already playing sentence
        if (playingSentenceIndex === sentenceIndex && audioState === 'playing') {
            audioRef.current.pause();
            setAudioState('paused');
            stopAtTimeRef.current = null;
            useReaderStore.getState().setIsAudioPlaying(false);
            useReaderStore.getState().setPlayingSentenceIndex(null);
            return;
        }

        const ts = audioTimestamps?.[sentenceIndex];
        if (ts) {
            audioRef.current.currentTime = ts.start;
            setCurrentTime(ts.start);
            stopAtTimeRef.current = ts.end;
        } else {
            stopAtTimeRef.current = null;
        }

        audioRef.current.play().then(() => {
            setAudioState('playing');
            useReaderStore.getState().setIsAudioPlaying(true);
            useReaderStore.getState().setPlayingSentenceIndex(sentenceIndex);
        }).catch(e => console.error("Sentence playback failed", e));
    }, [sentenceAudioTrigger, lessonAudio, audioState]);

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        stopAtTimeRef.current = null;
        if (audioState === 'playing') {
            audioRef.current.pause();
            setAudioState('paused');
            useReaderStore.getState().setIsAudioPlaying(false);
            useReaderStore.getState().setPlayingSentenceIndex(null);
        } else {
            setCurrentTime(audioRef.current.currentTime);
            audioRef.current.play().then(() => {
                setAudioState('playing');
                useReaderStore.getState().setIsAudioPlaying(true);
            }).catch(e => console.error("Playback failed", e));
        }
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setAudioState('stopped');
            setCurrentTime(0);
            stopAtTimeRef.current = null;
            useReaderStore.getState().setIsAudioPlaying(false);
            useReaderStore.getState().setActiveSentenceIndex(null);
            useReaderStore.getState().setPlayingSentenceIndex(null);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const time = audioRef.current.currentTime;
            setCurrentTime(time);
            // Fallback: update duration if onLoadedMetadata missed firing
            if (audioRef.current.duration && duration !== audioRef.current.duration) {
                setDuration(audioRef.current.duration);
            }

            // Bounded Sentence Playback Check
            if (stopAtTimeRef.current !== null && time >= stopAtTimeRef.current) {
                audioRef.current.pause();
                stopAtTimeRef.current = null;
                setAudioState('stopped');
                useReaderStore.getState().setIsAudioPlaying(false);
                useReaderStore.getState().setPlayingSentenceIndex(null);
                return;
            }

            // --- Read-along sync: ONLY during FULL audio playback ---
            // Must NOT run when audio is paused/stopped OR during inline bounded sentence playback
            const { isAudioPlaying, playingSentenceIndex, audioTimestamps, activeSentenceIndex, setActiveSentenceIndex, syncPageWithinSentence } = useReaderStore.getState();
            if (!isAudioPlaying || playingSentenceIndex !== null || stopAtTimeRef.current !== null) {
                return;
            }

            if (audioTimestamps) {
                const idx = audioTimestamps.findIndex(t => time >= t.start && time < t.end);
                if (idx !== activeSentenceIndex) {
                    setActiveSentenceIndex(idx === -1 ? null : idx);
                } else if (idx !== -1) {
                    // Same sentence as last tick — it may span multiple pages, so keep
                    // advancing the page as playback progresses through it.
                    const { start, end } = audioTimestamps[idx];
                    const fraction = end > start ? (time - start) / (end - start) : 0;
                    syncPageWithinSentence(idx, fraction);
                }
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (sec: number) => {
        if (isNaN(sec) || !isFinite(sec)) return "00:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleTimeSkip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime += seconds;
        }
    };

    const handleRateChange = (delta: number) => {
        setPlaybackRate(prev => {
            let newRate = prev + delta;
            if (newRate < 0.1) newRate = 0.1;
            if (newRate > 2.0) newRate = 2.0;
            return parseFloat(newRate.toFixed(2));
        });
    };


    // A page is now "Complete" if it contains ZERO stage 0 (blue) words.
    const isPageComplete = (pageIdx: number) => {
        const idsOnPage = columnMapping[pageIdx] || [];
        if (idsOnPage.length === 0) return true; // Empty page is complete
        
        const pageWords = idsOnPage.map(id => tokens.find(t => t.id === id)).filter(Boolean) as typeof tokens;
        const learnableOnPage = pageWords.filter(t => t.isLearnable);
        
        if (learnableOnPage.length === 0) return true;
        
        return !learnableOnPage.some(w => (w.stage ?? 0) === 0);
    };

    const { isLessonProcessed, blueCount } = useMemo(() => {
        const processed = !tokens.some(w => (w.isLearnable === true) && (w.stage ?? 0) === 0);
        
        const uniqueBlueWords = new Set(
            tokens
              .filter(w => w.isLearnable === true && (w.stage ?? 0) === 0)
              .map(w => w.text.toLowerCase())
        );
        return { isLessonProcessed: processed, blueCount: uniqueBlueWords.size };
    }, [tokens]);

    return (
        <div className="bg-[#f0f3f6] lg:rounded-lg shadow-sm flex flex-col relative border-t lg:border border-[#d8dee4] h-fit lg:mb-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full px-3 pt-3 pb-3 relative">
                
                {/* Audio Controls Container - fixed widths prevent layout jump (hidden in Sentence View) */}
                <div className={`flex items-center shrink-0 min-w-min xl:min-w-[280px] ${readerMode === 'sentence' ? 'hidden' : ''}`}>
                    <audio 
                        src={lessonAudio || '#'} 
                        ref={audioRef} 
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={handleStop} 
                        className="hidden" 
                    />

                    {/* Left Play Group */}
                    <div className="flex items-center w-[96px] shrink-0 gap-1.5">
                        <button 
                            onClick={handlePlayPause}
                            disabled={!lessonAudio}
                            className={`z-10 w-[46px] h-[46px] rounded-full flex items-center justify-center shadow-sm transition cursor-pointer shrink-0 border border-white/50
                                ${lessonAudio ? 'bg-[#3a92fb] hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed opacity-60'}`}
                        >
                            {audioState === 'playing' ? (
                                <Pause className="w-5 h-5 text-white" fill="currentColor" strokeWidth={1} />
                            ) : (
                                <Play className="w-5 h-5 ml-[2px] text-white" fill="currentColor" strokeWidth={1} />
                            )}
                        </button>

                        {/* Stop button ONLY when paused */}
                        {audioState === 'paused' && (
                            <button onClick={handleStop} className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 shrink-0" title="Stop">
                                <Square className="w-3.5 h-3.5" fill="currentColor" strokeWidth={1} />
                            </button>
                        )}
                    </div>

                    {/* Fwd/Rev Group (visible if not stopped) */}
                    <div className="flex items-center w-[90px] shrink-0">
                        {audioState !== 'stopped' && (
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => handleTimeSkip(-5)} className="text-[#3a92fb] border border-blue-200 bg-white shadow-sm font-black text-[10px] flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-50 transition" title="Reverse 5s">
                                    {'<5s'}
                                </button>
                                <button onClick={() => handleTimeSkip(5)} className="text-[#3a92fb] border border-blue-200 bg-white shadow-sm font-black text-[10px] flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-50 transition" title="Forward 5s">
                                    {'5s>'}
                                </button>
                            </div>
                        )}
                    </div>
                
                    {/* Speed Config & Time */}
                    <div className="flex flex-col justify-center w-fit shrink-0">
                        {lessonAudio && audioState !== 'stopped' && (
                             <div className="flex items-center bg-white rounded-full px-1 py-1 border border-gray-200 shadow-sm shrink-0">
                                 <button onClick={() => handleRateChange(-0.05)} className="text-gray-400 hover:text-blue-500 w-4 h-4 flex items-center justify-center font-black leading-none pb-0.5">-</button>
                                 <span className="text-[9px] font-black tracking-wider text-[#3a92fb] w-9 text-center tabular-nums">{playbackRate.toFixed(2)}x</span>
                                 <button onClick={() => handleRateChange(0.05)} className="text-gray-400 hover:text-blue-500 w-4 h-4 flex items-center justify-center font-black leading-none pb-0.5">+</button>
                             </div>
                        )}
                        {audioState !== 'stopped' && (
                             <span className="text-[10px] font-bold text-gray-500 tabular-nums text-center mt-1 w-[70px] self-center">
                                 {formatTime(currentTime)}/{formatTime(duration)}
                             </span>
                        )}
                    </div>
                </div>
            <div className={`flex items-center flex-1 h-full lg:mx-4 shrink`} dir={isRTL ? 'rtl' : 'ltr'}>
                {/* DESKTOP INTERACTIVE SEGMENTED PROGRESS BAR */}
                <div className={`hidden lg:flex flex-1 bg-gray-300 h-6 ${isRTL ? '-ml-1 rounded-tr-full rounded-br-full' : '-mr-1 rounded-tl-full rounded-bl-full'} overflow-hidden`}>
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <div 
                            key={i}
                            onClick={() => handlePageAdvance(i)}
                            className={`flex-1 relative cursor-pointer ${isRTL ? 'border-l' : 'border-r'} border-white last:border-0 transition-colors duration-300 flex items-center justify-center
                                ${i === 0 ? (isRTL ? 'rounded-r-full' : 'rounded-l-full') : ''} 
                                ${isPageComplete(i) ? 'bg-green-400' : 'bg-gray-400/40'}
                            `}
                        >
                            {/* White dot for Current Page */}
                            {currentPage === i && !showSummary && (
                                <div className="w-3 h-3 bg-white rounded-full shadow-sm "></div>
                            )}
                        </div>
                    ))}
                </div>

                {/* MOBILE/TABLET BEADS PROGRESS (Removed, moved to ReaderPane) */}
                {/* NEW WORDS COUNTER */}
                {isLessonProcessed ? (
                    <div className="hidden lg:flex items-center h-12 min-w-8 w-fit text-gray-600 font-bold text-sm bg-green-400 rounded-full">
                        <svg className="w-12 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                ) : (
                    <div className="hidden lg:flex items-center h-12 min-w-8 w-fit px-2 text-gray-600 font-bold text-sm bg-[#BAC0CA] rounded-full">
                        <div className="h-9 min-w-9 w-fit px-1 mx-auto flex items-center justify-center text-gray-500 font-bold text-sm bg-[#aee0f4] rounded-full border-2 border-white">
                            {blueCount}
                        </div>
                    </div>
                )}
            </div>
            <button className="hidden lg:flex bg-[#FFE578] text-[#C0A332] px-2 xl:px-3 py-1.5 rounded-md font-semibold text-md leading-none shadow-sm hover:bg-yellow-400 transition gap-1 xl:gap-2 items-center cursor-pointer shrink-0 mx-2">
                <span className="inline text-left">Review<br />LingQs</span>
                <div className="flex items-center">
                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                    <span className="opacity-70 text-lg xl:text-2xl text-black">({reviewCount})</span>
                </div>
            </button>

            </div>

            {/* AUDIO PROGRESS BAR (Top on mobile, Bottom on desktop) */}
            {audioState !== 'stopped' && readerMode !== 'sentence' && (
                <div className="w-full h-1.5 bg-gray-400 absolute -top-0 lg:top-auto lg:-bottom-1 left-0 group flex items-center z-10 ">
                    <div 
                        className="absolute left-0 h-full bg-[#EF4444] pointer-events-none transition-all duration-75"
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    {/* The scrubber head */}
                    <div 
                        className="absolute w-3.5 h-3.5 bg-white border-2 border-[#EF4444] rounded-full top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110 shadow hover:shadow-md"
                        style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 7px)` }}
                    />
                    <input
                        type="range"
                        min={0}
                        max={duration || 1}
                        step="0.01"
                        value={currentTime}
                        onChange={handleSeek}
                        className="absolute w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
            )}
        </div>
    )
}