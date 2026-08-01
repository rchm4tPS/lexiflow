// TODO: [RESPONSIVE] Halaman SummaryView (Mobile-first <1024px responsif lengkap)
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
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

    const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Today's created LingQs
    const todayCreated = last7DaysStats[last7DaysStats.length - 1]?.created || 0;
    const lingqsNeeded = Math.max(0, tier.lingqGoal - todayCreated);

    // Goal Progress Ring Calculation
    const ringRadius = 42;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const goalProgressPct = Math.min(100, (todayCreated / (tier.lingqGoal || 1)) * 100);
    const ringOffset = ringCircumference - (goalProgressPct / 100) * ringCircumference;

    // Line Chart Dataset for Recharts
    const chartData = last7DaysStats.map((stat) => {
        const dateObj = stat.date ? new Date(stat.date) : new Date();
        const dayLabel = DAYS_SHORT[dateObj.getDay()];
        return {
            day: dayLabel,
            created: stat.created,
        };
    });

    return (
        <div className="w-full min-h-full flex flex-col items-center bg-white font-nunito animate-fade-in relative overflow-y-auto pb-6 px-4 sm:px-8">
            {/* Top Container Box */}
            <div className="w-full max-w-[640px] bg-white  flex flex-col items-center relative">
                
                {/* Dedicated Top Row for Back Arrow (No Overlap) */}
                <div className="w-full flex items-center justify-between mb-2">
                    <button
                        onClick={() => setShowSummary(false)}
                        className="flex items-center text-[#5DE96A] hover:text-[#4ad45b] pt-4 rounded-lg hover:bg-green-50 transition cursor-pointer"
                        title="Return to Reader"
                    >
                        {isRTL ? <RightArrow className="w-8 h-8" /> : <LeftArrow className="w-7 h-7" />}
                    </button>
                </div>

                {/* Heading Title */}
                <div className="text-center mb-6">
                    <h1 className="text-xl sm:text-2xl font-black text-[#3a92fb] leading-tight">
                        Woohoo!
                    </h1>
                    <p className="text-base sm:text-lg font-extrabold text-[#3a92fb] mt-0.5">
                        You now know {totalKnownWords.toLocaleString()} words in {currentLanguageName}!
                    </p>
                </div>

                {/* Circular Goal Progress Ring */}
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 flex items-center justify-center mb-6 transition-all">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background track */}
                        <circle
                            cx="50"
                            cy="50"
                            r={ringRadius}
                            className="stroke-gray-200"
                            strokeWidth="8"
                            fill="transparent"
                        />
                        {/* Progress ring */}
                        <circle
                            cx="50"
                            cy="50"
                            r={ringRadius}
                            className="stroke-[#5ad263] transition-all duration-700 ease-out"
                            strokeWidth="8"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                            strokeLinecap="round"
                            fill="transparent"
                        />
                    </svg>

                    {/* Ring Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                        {lingqsNeeded > 0 ? (
                            <>
                                <span className="text-2xl sm:text-3xl md:text-4xl font-black text-[#3a92fb]">{lingqsNeeded}</span>
                                <span className="text-[11px] sm:text-xs font-bold text-blue-500 leading-tight">
                                    LingQs to daily goal
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="text-xl sm:text-2xl font-black text-green-500">Goal</span>
                                <span className="text-[11px] sm:text-xs font-bold text-green-600 leading-tight">
                                    Reached! 🎉
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Line Chart Header Legend */}
                <div className="w-full flex items-center justify-between mb-1 px-2 text-xs font-bold">
                    <div className="flex items-center gap-2 text-red-500">
                        <span className="w-3 h-0.5 bg-red-500 rounded-full inline-block"></span>
                        <span>LingQs created</span>
                    </div>
                </div>

                {/* Recharts Line Chart Container with Goal ReferenceLine */}
                <div
                    className="w-full h-36 relative bg-white pt-2 pb-1 outline-none focus:outline-none focus:ring-0 select-none [&_*]:outline-none [&_*]:focus:outline-none overflow-visible [&_svg]:overflow-visible"
                    style={{ paddingLeft: 'calc(100% / 14)', paddingRight: 'calc(100% / 14)' }}
                >
                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 144 }} style={{ outline: 'none', overflow: 'visible' }}>
                        <LineChart data={chartData} margin={{ top: 24, right: 0, left: 0, bottom: 0 }} style={{ outline: 'none', overflow: 'visible' }}>
                            <XAxis
                                dataKey="day"
                                axisLine={{ stroke: '#e5e7eb' }}
                                tickLine={false}
                                interval={0}
                                tickMargin={4}
                                tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }}
                            />
                            <YAxis
                                hide
                                domain={[0, (dataMax: number) => Math.max(dataMax, tier.lingqGoal + 4)]}
                            />
                            <ReferenceLine
                                y={tier.lingqGoal}
                                stroke={tier.hex || '#10b981'}
                                strokeDasharray="4 4"
                                strokeWidth={2}
                                label={{
                                    value: `Goal: ${tier.lingqGoal} (${tier.label} ${tier.emoji})`,
                                    fill: tier.hex || '#059669',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    position: 'top',
                                }}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-gray-800 text-white text-xs font-bold py-1 px-2 rounded shadow-md">
                                                {payload[0].value} LingQs
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line
                                type="linear"
                                dataKey="created"
                                stroke="#ef4444"
                                strokeWidth={3}
                                isAnimationActive={true}
                                animationDuration={600}
                                animationEasing="ease-out"
                                activeDot={{ r: 8, fill: '#ef4444' }}
                                dot={(props: any) => {
                                    const { cx, cy, value, index } = props;
                                    if (cx === undefined || cy === undefined) return null;
                                    return (
                                        <g key={`custom-dot-${index}`}>
                                            <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                                            <text
                                                x={cx}
                                                y={cy - 10}
                                                fill="#ef4444"
                                                fontSize={11}
                                                fontWeight={800}
                                                textAnchor="middle"
                                            >
                                                {value}
                                            </text>
                                        </g>
                                    );
                                }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* 7-Day Streak Status Avatars (7-Column Grid 100% Aligned with Chart Points) */}
                <div className="grid grid-cols-7 w-full my-5 justify-items-center">
                    {chartData.map((item, idx) => {
                        const reachedGoal = item.created >= tier.lingqGoal;
                        const hasActivity = item.created > 0;

                        let avatarBg = "bg-red-100 text-red-500 border border-red-200";
                        let emoji = "😐";

                        if (reachedGoal) {
                            avatarBg = "bg-yellow-400 text-yellow-900 shadow-sm";
                            emoji = "😊";
                        } else if (hasActivity) {
                            avatarBg = "bg-blue-100 text-blue-600";
                            emoji = "🙂";
                        }

                        return (
                            <div key={idx} className="flex flex-col items-center gap-1">
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm sm:text-base md:text-xl transition-all ${avatarBg}`}>
                                    {emoji}
                                </div>
                                <span className={`text-[11px] sm:text-xs font-bold ${reachedGoal ? 'text-yellow-600' : (hasActivity ? 'text-blue-500' : 'text-red-400')}`}>
                                    {item.day}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="w-full border-t border-gray-200 my-2" />

                {/* Coins Display Row */}
                <div className="w-full flex items-center justify-end px-2 py-2">
                    <div className="bg-[#FFE578] px-4 py-1.5 rounded-full border border-yellow-300 shadow-sm flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-yellow-500 border border-white flex items-center justify-center shadow-inner">
                            <span className="text-white text-[10px] font-black">C</span>
                        </div>
                        <span className="font-extrabold text-yellow-900 text-sm">
                            {(totalCoins || 0).toLocaleString()} Coins
                        </span>
                    </div>
                </div>

                <div className="w-full border-t border-gray-200 my-2" />

                {/* Action Buttons (CTA) */}
                <div className="w-full flex flex-col items-center gap-3 mt-3 mb-2">
                    {prevLessonId && (
                        <button
                            onClick={async () => {
                                await apiClient(`/lessons/${prevLessonId}/reset`, { method: 'POST' });
                                window.location.href = `/me/${languageCode}/reader/${prevLessonId}`;
                            }}
                            className="w-full py-3 px-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-sm sm:text-base transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                        >
                            {!isRTL && <LeftArrow className="w-5 h-5 text-gray-600 shrink-0" />}
                            <span>Previous Lesson</span>
                            {isRTL && <RightArrow className="w-5 h-5 text-gray-600 shrink-0" />}
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
                        className={`w-full py-3.5 px-6 rounded-full font-black text-base sm:text-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                            nextLessonId 
                                ? 'bg-[#5ad263] hover:bg-green-600 text-white active:scale-95' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70'
                        }`}
                    >
                        {nextLessonId && isRTL && <LeftArrow className="w-5 h-5 text-white shrink-0" />}
                        <span>{nextLessonId ? 'Continue to next lesson' : 'End of course reached'}</span>
                        {nextLessonId && !isRTL && <RightArrow className="w-5 h-5 text-white shrink-0" />}
                    </button>

                    {!nextLessonId && (
                        <button
                            onClick={() => setShowSummary(false)}
                            className="text-gray-400 hover:text-gray-600 font-bold transition cursor-pointer text-xs mt-1"
                        >
                            Return to Reader
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}