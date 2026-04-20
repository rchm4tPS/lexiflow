import { useState, useEffect } from 'react';
import { useReaderStore } from '../../../store/useReaderStore';
import { TIERS, getTier } from '../../../constants/tiers';
import type { UserStats } from '../../../types/reader';

export default function DailyGoalWidget() {
    const {
        totalKnownWords, totalStreaks,
        totalDailyLingqs, totalDailyLingqsLearned,
        totalDailyListeningSec, totalDailyWordsRead,
        last7DaysStats, last30DaysStats,
        dailyGoalTier, updateDailyGoalTier
    } = useReaderStore();

    const activeTier = getTier(dailyGoalTier);
    const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d'>('today');

    // Countdown to Midnight
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        function updateTimer() {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const diff = tomorrow.getTime() - now.getTime();

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${hours}:${mins.toString().padStart(2, '0')}`);
        }

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    // Helper to sum up arrays for 7d/30d views
    const aggregate = (stats: UserStats[]) => stats.reduce((acc, curr) => ({
        created: acc.created + (curr.created || 0),
        learned: acc.learned + (curr.learned || 0),
        listening: acc.listening + (curr.listening || 0),
        words: acc.words + (curr.words || 0),
    }), { created: 0, learned: 0, listening: 0, words: 0 });

    // Determine current stats based on timeframe
    const currentStats = timeframe === '7d' 
        ? aggregate(last7DaysStats) 
        : timeframe === '30d' 
            ? aggregate(last30DaysStats) 
            : { 
                created: totalDailyLingqs, 
                learned: totalDailyLingqsLearned, 
                listening: totalDailyListeningSec, 
                words: totalDailyWordsRead 
              };

    const multiplier = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 1;

    // Goals scaled by timeframe
    const lingqGoal = activeTier.lingqGoal * multiplier;
    const learnedGoal = activeTier.learnedGoal * multiplier;
    const listenGoalSec = activeTier.listenMinGoal * 60 * multiplier;
    const readGoal = activeTier.readGoal * multiplier;

    // Formatting helpers
    const currentListeningMins = (currentStats.listening / 60).toFixed(2);
    const listenGoalMins = (listenGoalSec / 60).toFixed(0);

    // Progress %
    const lingqProgress = Math.min(100, (currentStats.created / lingqGoal) * 100);
    const learnedProgress = Math.min(100, (currentStats.learned / learnedGoal) * 100);
    const listeningProgress = Math.min(100, (currentStats.listening / listenGoalSec) * 100);
    const readingProgress = Math.min(100, (currentStats.words / readGoal) * 100);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col sticky top-22 z-10 transition-all">
            <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex flex-col gap-3">
                <p className="text-[14px] font-black text-gray-700 text-center">DAILY STREAK & GOALS</p>
            </div>

            <div className="p-4 bg-gray-50 flex items-center justify-between border-t border-gray-200">
                <div className="flex flex-col items-center flex-1 border-r border-gray-200">
                    <span className={`text-xl font-black text-gray-700 ${totalStreaks > 0 ? "-ml-2" : ""}`}>{totalStreaks > 0 ? "🔥" : ""}{totalStreaks}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Streak</span>
                </div>
                <div className="flex flex-col items-center flex-1" title="Time remaining until daily goals reset at midnight">
                    <span className={`text-xl font-black text-gray-700 ${Number(timeLeft.split(":")[0]) <= 3 ? "text-red-500" : ""}`}>{timeLeft}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Remaining</span>
                </div>
            </div>

            {/* Statistics Section */}
            <div className="p-4 bg-gray-50/50 flex flex-col items-center gap-4 relative">
                <div className="flex gap-2 bg-white border border-gray-200 rounded-lg p-1 w-full shadow-sm">
                    <button className="flex-1 py-1 px-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded">Avatar</button>
                    <button className="flex-1 py-1 px-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded">Challenges</button>
                    <button className="flex-1 py-1 px-2 text-xs font-bold bg-[#60cc6a] text-white rounded shadow-sm">Statistics</button>
                </div>

                <div className="flex flex-col items-center">
                    <p className="text-4xl font-extrabold text-[#3890fc]">{totalKnownWords}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tight -mt-1">known words</p>
                </div>

                <div className="relative group w-full px-4">
                    <div className="border border-gray-200 rounded px-3 py-1.5 flex justify-between items-center text-[11px] font-bold text-gray-500 bg-white cursor-pointer hover:border-gray-300">
                        <span className="capitalize">{timeframe === '7d' ? 'last 7 days' : timeframe === '30d' ? 'last month' : 'today'}</span>
                        <span className="text-[8px]">▼</span>
                    </div>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute top-full left-4 right-4 bg-white border border-gray-200 rounded shadow-lg hidden group-hover:block z-20">
                        {(['today', '7d', '30d'] as const).map(tf => (
                            <div 
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className="px-3 py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-50 cursor-pointer border-b last:border-0 border-gray-100 capitalize"
                            >
                                {tf === '7d' ? 'last 7 days' : tf === '30d' ? 'last month' : 'today'}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Metrics List */}
            <div className="p-5 flex flex-col gap-6">
                {/* 1. LingQs Progress (Created) */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                        <span>{Math.round(currentStats.created)} LingQs</span>
                        <span className="text-gray-400">{lingqGoal}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-700 rounded-full bg-gradient-to-r ${activeTier.color}`}
                            style={{ width: `${lingqProgress}%` }}
                        />
                    </div>
                </div>

                {/* 2. LingQs Learned */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                        <span>{Math.round(currentStats.learned)} LingQs Learned</span>
                        <span className="text-gray-400">{learnedGoal}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${activeTier.color} transition-all duration-700 rounded-full`} style={{ width: `${learnedProgress}%` }} />
                    </div>
                </div>

                {/* 3. Minutes of Listening */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                        <span className="flex items-center gap-2">
                            {currentListeningMins} Minutes of Listening
                        </span>
                        <span className="text-gray-400">{listenGoalMins}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${activeTier.color} transition-all duration-700 rounded-full`} style={{ width: `${listeningProgress}%` }} />
                    </div>
                </div>

                {/* 4. Words of Reading */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                        <span className="flex items-center gap-2">
                            {Math.round(currentStats.words)} Words of Reading
                        </span>
                        <span className="text-gray-400">{readGoal}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${activeTier.color} transition-all duration-700 rounded-full`} style={{ width: `${readingProgress}%` }} />
                    </div>
                </div>
            </div>

            {/* Tier Switcher / Color Swatches */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex flex-col gap-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Switch Daily Goal</p>
                <div className="flex justify-center gap-3">
                    {TIERS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => updateDailyGoalTier(t.id)}
                            title={t.label + ': ' + t.desc}
                            className={`w-8 h-8 rounded-full border-2 transition-all p-0.5 ${dailyGoalTier === t.id
                                ? `scale-110 shadow-md ${t.border}`
                                : 'border-white opacity-40 hover:opacity-100'
                                }`}
                        >
                            <div className={`w-full h-full rounded-full bg-gradient-to-tr ${t.color}`} />
                        </button>
                    ))}
                </div>
                <div className="text-center">
                    <p className={`text-xs font-black uppercase tracking-tight ${activeTier.text}`}>
                        {activeTier.emoji} {activeTier.label} Mode
                    </p>
                </div>
            </div>
        </div>
    );
}
