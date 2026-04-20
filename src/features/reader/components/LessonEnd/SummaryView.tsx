import { useReaderStore } from '../../../../store/useReaderStore';
import { apiClient } from '../../../../api/client';
import { LeftArrow, RightArrow } from '../../../../components/common/Icons';
import { getTier } from '../../../../constants/tiers';

export default function SummaryView() {
    const { 
        totalKnownWords, totalCoins, setShowSummary, isRTL, languageCode, availableLanguages, 
        last7DaysStats, dailyGoalTier, nextLessonId, prevLessonId 
    } = useReaderStore();
    const currentLanguageName = availableLanguages.find(l => l.code === languageCode)?.name || 'this language';
    const tier = getTier(dailyGoalTier);

    type DayItemProps = {
        day: string;
        isToday: boolean;
        created: number;
        learned: number;
        listening: number;
        words: number;
    };

    const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const maxLingqs = Math.max(...last7DaysStats.map(s => s.created), tier.lingqGoal || 13);

    const DayItem = ({ day, isToday, created, learned, listening, words }: DayItemProps) => {
        const totalActivity = created + learned + listening + words;
        
        // Yellow if ALL metrics meet their respective goal from the tier
        const reachedGoal = 
            created >= tier.lingqGoal && 
            learned >= tier.learnedGoal && 
            listening >= tier.listenMinGoal * 60 && 
            words >= tier.readGoal;

        const hasSomeActivity = totalActivity > 0;

        let statusColor = "bg-red-500"; // Default: No progress (Red)
        if (reachedGoal) {
            statusColor = "bg-yellow-400"; // Passed (Yellow)
        } else if (hasSomeActivity) {
            statusColor = "bg-gray-400"; // Some progress (Grey)
        }

        const baseClasses = "flex flex-col items-center";
        const circleClasses = `w-12 h-12 rounded-full mb-2 border-2 border-white shadow-sm transition-colors ${statusColor} ${isToday ? 'ring-2 ring-blue-300' : ''}`;
        const textClasses = `text-xs font-bold ${reachedGoal ? "text-yellow-600" : "text-gray-500"}`;

        return (
            <div className={`${baseClasses}`}>
                <div className={circleClasses}></div>
                <span className={textClasses}>
                    {day}({created})
                </span>
            </div>
        );
    };

    return (
        <div className="w-full flex flex-col items-center py-10 animate-fade-in relative h-full overflow-auto">
            {/* Back Arrow */}
            <button
                onClick={() => setShowSummary(false)}
                className={`top-1/2 -translate-y-1/2 text-[#5DE96A] cursor-pointer ${isRTL ? 'absolute right-4' : 'absolute left-4'}`}
            >
                {isRTL ? <RightArrow /> : <LeftArrow />}
            </button>

            <h1 className="text-3xl font-bold text-[#3a92fb] mb-12">
                Wow! You know {totalKnownWords.toLocaleString()} words in {currentLanguageName}!
            </h1>

            {/* Main Stats Area */}
            <div className="flex items-center justify-around rounded-md p-4 w-full max-w-5xl mb-10">
                <div className="w-48 h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 font-bold italic">Progress Overview</div>

                {/* Real-World Chart */}
                <div className="flex-1 h-64 mx-16 border-b-2 border-l-2 border-gray-200 relative flex items-end gap-6 px-6 pb-2">
                    {last7DaysStats.map((stat, idx) => {
                        const heightPct = Math.min(100, (stat.created / maxLingqs) * 100);
                        const isGoalMet = 
                            stat.created >= tier.lingqGoal && 
                            stat.learned >= tier.learnedGoal && 
                            stat.listening >= tier.listenMinGoal * 60 && 
                            stat.words >= tier.readGoal;

                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20">
                                    {stat.created} LingQs / {stat.words} words
                                </div>
                                <div
                                    className={`w-full ${isGoalMet ? 'bg-yellow-400' : 'bg-blue-400'} rounded-t transition-all duration-500 hover:opacity-80`}
                                    style={{ height: `${heightPct}%` }}
                                ></div>
                                <span className="absolute -bottom-6 text-[10px] font-bold text-gray-400">
                                    {stat.date ? DAYS_SHORT[new Date(stat.date).getDay()] : ''}
                                </span>
                            </div>
                        );
                    })}
                    <p className="absolute -left-20 top-20 -rotate-90 text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">LingQs Created</p>
                    <p className="absolute left-1/2 -translate-x-1/2 -bottom-10 text-xs text-gray-400 font-bold">Activity (Last 7 Days)</p>
                </div>

                <div className="w-48 h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 font-bold italic">Keep it up!</div>
            </div>

            {/* Daily Goal Tier */}
            <div className='flex w-full flex-col md:flex-row justify-between items-center px-48 py-8 mt-4 gap-8'>
                <div className="flex flex-col gap-4 text-center">
                    <p className="font-bold text-gray-600">Make sure you're meeting the daily goal ({tier.label}: {tier.lingqGoal} LingQs)</p>
                    <div className='flex gap-4 mt-2'>
                        {last7DaysStats.map((stat, idx) => {
                            const date = stat.date ? new Date(stat.date) : new Date();
                            const dayName = DAYS_SHORT[date.getDay()];
                            const isToday = idx === last7DaysStats.length - 1;
                            return (
                                <DayItem
                                    key={idx}
                                    day={dayName}
                                    isToday={isToday}
                                    created={stat.created}
                                    learned={stat.learned}
                                    listening={stat.listening}
                                    words={stat.words}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        {prevLessonId && (
                            <button
                                onClick={async () => {
                                    await apiClient(`/lessons/${prevLessonId}/reset`, { method: 'POST' });
                                    window.location.href = `/me/${languageCode}/reader/${prevLessonId}`;
                                }}
                                className="bg-gray-200 text-gray-700 px-8 py-4 rounded-full text-lg font-bold shadow-md hover:bg-gray-300 hover:scale-105 active:scale-95 transition transform cursor-pointer flex items-center gap-2"
                            >
                                ⇦ Previous Lesson
                            </button>
                        )}
                        
                        <button
                            disabled={!nextLessonId}
                            onClick={async () => {
                                if (nextLessonId) {
                                    await apiClient(`/lessons/${nextLessonId}/reset`, { method: 'POST' });
                                    window.location.href = `/me/${languageCode}/reader/${nextLessonId}`;
                                }
                            }}
                            className={`${nextLessonId ? 'bg-[#5DE96A] hover:bg-[#4ad45b] shadow-xl hover:scale-105 active:scale-95' : 'bg-gray-300 cursor-not-allowed opacity-60'} h-fit text-white px-12 py-4 rounded-full text-xl font-bold transition transform cursor-pointer flex items-center gap-2`}
                        >
                            {nextLessonId ? 'Continue to next lesson ➔' : 'End of course reached'}
                        </button>
                    </div>

                    {!nextLessonId && (
                         <button
                            onClick={() => setShowSummary(false)}
                            className="text-gray-400 hover:text-gray-600 font-bold transition cursor-pointer text-sm"
                        >
                            Return to Reader
                        </button>
                    )}
                </div>
            </div>

            {/* Coins Pill */}
            <div className="absolute bottom-4 right-4 bg-[#FFE578] px-6 py-2 rounded-full border-2 border-white shadow-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-yellow-500 border border-white flex items-center justify-center shadow-inner">
                    <span className="text-white text-xs font-black">C</span>
                </div>
                <span className="font-bold text-yellow-900">{totalCoins?.toLocaleString()} Coins</span>
            </div>
        </div>
    );
}