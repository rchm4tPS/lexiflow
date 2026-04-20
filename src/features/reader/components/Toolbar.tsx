import { useState, useRef, useEffect } from 'react';
import { useReaderStore } from '../../../store/useReaderStore';
import { Play, Pause, Square } from 'lucide-react';

export default function Toolbar() {
    const { tokens, setPage, currentPage, showSummary, isRTL, lessonAudio, incrementListeningTicks, readerMode } = useReaderStore();

    const audioRef = useRef<HTMLAudioElement>(null);
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

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (audioState === 'playing') {
            audioRef.current.pause();
            setAudioState('paused');
        } else {
            audioRef.current.play().then(() => setAudioState('playing')).catch(e => console.error("Playback failed", e));
        }
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setAudioState('stopped');
            setCurrentTime(0);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
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


    // Find how many pages are in the current dataset
    const totalPages = Math.max(...tokens.map(w => (readerMode === 'sentence' ? w.sentencePageIndex : w.pageIndex) || 0)) + 1;

    // A page is now "Complete" if it contains ZERO stage 0 (blue) words.
    const isPageComplete = (pageIdx: number) => {
        const pageWords = tokens.filter(w => (readerMode === 'sentence' ? w.sentencePageIndex : w.pageIndex) === pageIdx);
        // Only count tokens that are meant to be learned
        const learnableOnPage = pageWords.filter(t => t.isLearnable === true);

        if (learnableOnPage.length === 0) return true;
        
        // Logic: No words on this page have stage 0
        return !learnableOnPage.some(w => (w.stage ?? 0) === 0);
    };

    // The checklist turns green when there are NO learnable tokens with stage 0
    const isLessonProcessed = !tokens.some(w => (w.isLearnable === true) && (w.stage ?? 0) === 0);

    // Count only unique texts of learnable blue words (stage === 0)
    const uniqueBlueWords = new Set(
        tokens
          .filter(w => w.isLearnable === true && (w.stage ?? 0) === 0)
          .map(w => w.text.toLowerCase())
    );
    const blueCount = uniqueBlueWords.size;

    return (
        <div className="bg-[#f0f3f6] rounded-lg shadow-sm flex flex-col relative border border-[#d8dee4] h-fit mb-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full px-3 pt-3 pb-3 relative">
                
                {/* Audio Controls Container - fixed widths prevent layout jump */}
                <div className="flex items-center shrink-0 min-w-[280px]">
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
            <div className={`flex items-center w-1/2 h-full`} dir={isRTL ? 'rtl' : 'ltr'}>
                {/* INTERACTIVE SEGMENTED PROGRESS BAR */}
                <div className={` flex-1 bg-gray-300 h-6 ${isRTL ? '-ml-1 rounded-tr-full rounded-br-full' : '-mr-1 rounded-tl-full rounded-bl-full'} overflow-hidden flex`}>

                    {Array.from({ length: totalPages }).map((_, i) => (
                        <div 
                            key={i}
                            onClick={() => setPage(i)}
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
                {/* NEW WORDS COUNTER */}
                {isLessonProcessed ? (
                    <div className="flex items-center h-12 min-w-8 w-fit text-gray-600 font-bold text-sm bg-green-400 rounded-full">
                        <svg className="w-12 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                ) : (
                    <div className="flex items-center h-12 min-w-8 w-fit px-2 text-gray-600 font-bold text-sm bg-[#BAC0CA] rounded-full">
                        <div className="h-9 min-w-9 w-fit px-1 mx-auto flex items-center justify-center text-gray-500 font-bold text-sm bg-[#aee0f4] rounded-full border-2 border-white">
                            {blueCount}
                        </div>
                    </div>
                )}
            </div>
            <button className="bg-[#FFE578] text-[#C0A332] px-2 py-1.5 rounded-md font-semibold text-md leading-none shadow-sm hover:bg-yellow-400 transition flex gap-2 items-center cursor-pointer">
                Review<br />LingQs <span className="opacity-70 text-2xl text-black">(24)</span>
            </button>
            <div className="flex items-center justify-between">
                <svg className="w-12 h-12 text-gray-400 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            </div>

            {/* AUDIO PROGRESS BAR (Bottom of Toolbar) */}
            {audioState !== 'stopped' && (
                <div className="w-full h-1.5 bg-gray-400 absolute -bottom-1 left-0 group flex items-center z-10 ">
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