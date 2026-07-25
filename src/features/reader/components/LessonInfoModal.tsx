import { useEffect } from 'react';
import { X, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReaderStore } from '../../../store/useReaderStore';

interface LessonInfoModalProps {
  onClose: () => void;
}

export default function LessonInfoModal({ onClose }: LessonInfoModalProps) {
  const {
    lessonTitle,
    lessonImg,
    courseId,
    courseLevel,
    languageCode,
    tokens,
    lessonDuration,
    authorName,
    readTimes,
    totalListenedSec,
    sessionListeningTicks,
    sessionWordsRead,
  } = useReaderStore();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const actualListenedSec = totalListenedSec + sessionListeningTicks;
  const actualReadTimes = readTimes + sessionWordsRead;

  const listenedTimes = lessonDuration > 0 ? (actualListenedSec / lessonDuration).toFixed(1).replace(/\.0$/, '') : '0';
  const totalUsableWords = tokens.filter(t => t.isLearnable && !t.isNewline).length;
  const formattedReadTimes = totalUsableWords > 0 ? (actualReadTimes / totalUsableWords).toFixed(1).replace(/\.0$/, '') : '0';
  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Compute Stats
  const learnableTokens = tokens.filter(t => t.isLearnable);
  const totalWords = tokens.length;
  const uniqueWordsSet = new Set(learnableTokens.map(t => t.text.toLowerCase()));
  const uniqueWords = uniqueWordsSet.size;

  const knownWords = new Set(learnableTokens.filter(t => t.stage === 4).map(t => t.text.toLowerCase())).size;
  const lingQs = new Set(learnableTokens.filter(t => (t.stage ?? 0) > 0 && (t.stage ?? 0) < 4).map(t => t.text.toLowerCase())).size;
  const newWords = Math.max(0, uniqueWords - knownWords - lingQs);

  const newPct = uniqueWords ? Math.round((newWords / uniqueWords) * 100) : 0;
  const lingQsPct = uniqueWords ? Math.round((lingQs / uniqueWords) * 100) : 0;
  const knownPct = uniqueWords ? Math.round((knownWords / uniqueWords) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="w-full max-w-4xl bg-[#222425] text-white rounded-xl overflow-hidden shadow-2xl relative max-h-[95vh] overflow-y-auto flex flex-col font-sans border border-gray-700/50">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/40 hover:bg-black/60 flex items-center justify-center rounded-full transition cursor-pointer backdrop-blur-md"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Hero Section */}
        <div className="relative h-64 md:h-80 w-full shrink-0 bg-black">
          {/* Backdrop Image */}
          <img 
            src={lessonImg || "https://placehold.co/800x400/2a2a2a/FFF?text=No+Image"} 
            className="absolute inset-0 w-full h-full object-cover opacity-60 blur-md scale-105" 
            alt="Backdrop"
          />
          {/* Centered Image (Optional, to mimic LingQ cover) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-80">
            <img src={lessonImg || undefined} className="h-full object-contain mix-blend-screen" />
          </div>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#222425] via-[#222425]/40 to-transparent" />
          
          {/* Title & Buttons */}
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 flex flex-col justify-end">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5 text-white shadow-sm">{lessonTitle}</h2>
            <div className="flex items-center gap-3">
              {courseId && (
                <Link 
                  to={`/me/${languageCode}/course/${courseId}`} 
                  onClick={onClose}
                  className="bg-[#2a2b2e] hover:bg-[#343538] border border-white/10 px-5 py-2.5 rounded-full font-semibold text-sm transition"
                >
                  View Course
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-10 md:gap-16 shrink-0 bg-[#222425]">
          
          {/* Left Column (Meta & Author) */}
          <div className="flex-1">
            <div className="flex items-center gap-6 text-gray-200 font-semibold mb-5 text-[15px]">
              <span>{courseLevel || 'Beginner 1'}</span>
              <span className="flex items-center gap-2">
                <Headphones className="w-4 h-4" /> 
                {formatTime(lessonDuration)}
              </span>
            </div>

            {/* Author / Shared By */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-11 h-11 rounded-full bg-[#A8E6CF] text-[#1E5631] font-bold flex items-center justify-center text-lg uppercase">
                {authorName.slice(0, 2)}
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-0.5">Shared By</p>
                <p className="font-semibold text-gray-100 text-[15px]">{authorName}</p>
              </div>
            </div>
          </div>

          {/* Right Column (Stats) */}
          <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-5">
            {/* New Words */}
            <div>
              <div className="flex justify-between text-[15px] font-semibold mb-2">
                <span className="text-white">New words ({newPct}%)</span>
                <span className="text-white">{newWords}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: `${newPct}%` }} />
              </div>
            </div>

            {/* LingQs */}
            <div>
              <div className="flex justify-between text-[15px] font-semibold mb-2">
                <span className="text-white">LingQs</span>
                <span className="text-white">{lingQs}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#FACC15] rounded-full" style={{ width: `${lingQsPct}%` }} />
              </div>
            </div>

            {/* Known Words */}
            <div>
              <div className="flex justify-between text-[15px] font-semibold mb-2">
                <span className="text-white">Known words</span>
                <span className="text-white">{knownWords}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${knownPct}%` }} />
              </div>
            </div>

            <div className="text-right text-[13px] text-gray-300 mt-1 font-medium">
              {totalWords} Total Words | {uniqueWords} Unique Words
            </div>

            <div className="flex justify-between text-[14px] text-gray-300 font-medium mt-2">
              <span>Read: <span className="text-white font-semibold">{formattedReadTimes}x</span></span>
              <span>{actualReadTimes} words</span>
            </div>
            
            <div className="flex justify-between text-[14px] text-gray-300 font-medium">
              <span>Listened: <span className="text-white font-semibold">{listenedTimes}x</span></span>
              <span>{formatTime(actualListenedSec)}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
