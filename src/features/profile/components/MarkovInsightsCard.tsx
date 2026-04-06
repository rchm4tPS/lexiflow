import type { MarkovInsights } from '../../../types/reader';

interface MarkovInsightsCardProps {
    title: string;
    insights: MarkovInsights;
    colorClass: string;
    isPhrase?: boolean;
}

export default function MarkovInsightsCard({ title, insights, colorClass, isPhrase = false }: MarkovInsightsCardProps) {
    const bgFrom = colorClass === 'indigo' ? 'from-indigo-50' : 'from-teal-50';
    const bgTo = colorClass === 'indigo' ? 'to-blue-50' : 'to-emerald-50';
    const border = colorClass === 'indigo' ? 'border-indigo-100' : 'border-teal-100';
    const textPrimary = colorClass === 'indigo' ? 'text-indigo-900' : 'text-teal-900';
    const textSecondary = colorClass === 'indigo' ? 'text-indigo-400' : 'text-teal-400';
    const textAccent = colorClass === 'indigo' ? 'text-indigo-600' : 'text-teal-600';
    const bgBadge = colorClass === 'indigo' ? 'bg-indigo-600' : 'bg-teal-600';
    const bgProgress = colorClass === 'indigo' ? 'bg-indigo-100' : 'bg-teal-100';

    return (
        <div className={`bg-gradient-to-br ${bgFrom} ${bgTo} rounded-2xl p-8 border ${border} shadow-sm relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                 <span className={`text-6xl font-black ${textPrimary} pointer-events-none uppercase`}>{isPhrase ? 'PHRASE' : 'WORD'}</span>
            </div>
            
            <h2 className={`text-2xl font-bold mb-6 ${textPrimary} flex items-center gap-3`}>
                <span className={`${bgBadge} text-white p-1.5 rounded-lg text-sm`}>AI</span>
                {title}
            </h2>

            {!insights?.hasInsights ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                    <div className="lg:col-span-1 text-center py-8">
                        <div className={`${textAccent} font-bold mb-2`}>Analyzing patterns...</div>
                        <p className={`text-sm ${textSecondary}`}>Interact with 50+ stage changes for Markov insights!</p>
                        <div className={`${bgProgress} h-1 w-full rounded-full overflow-hidden mt-4`}>
                            <div className={`${bgBadge} h-full animate-pulse transition-all`} style={{ width: '40%' }}></div>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-100 flex items-center justify-between">
                            <div>
                                <div className={`text-3xl font-black ${textPrimary}`}>{(insights?.discoveryVelocity || 0).toFixed(1)}</div>
                                <div className={`text-[10px] font-bold ${textSecondary} uppercase`}>Discoveries / Day</div>
                                <div className={`text-[9px] ${textSecondary} mt-1`}>Initial identification & creation</div>
                            </div>
                            <div className="text-right">
                                <span className={`${bgBadge} text-white text-[10px] px-2 py-1 rounded font-bold uppercase`}>Collecting Baselines</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                    <div className="flex flex-col items-center">
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className={bgProgress} />
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * (insights.metrics.steady_mastery || 0)) / 100} className={`${textAccent} transition-all duration-1000 ease-out`} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-4xl font-black ${textPrimary}`}>{Math.round(insights.metrics.steady_mastery)}%</span>
                                <span className={`text-[10px] font-bold ${textSecondary} uppercase tracking-widest`}>Mastery</span>
                            </div>
                        </div>
                        <p className={`text-[10px] ${textAccent} mt-4 text-center font-bold uppercase tracking-wider`}>
                            Long-term steady state
                        </p>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <h3 className={`font-bold ${textPrimary}`}>Dynamic Equilibrium</h3>
                                <span className={`text-xs font-bold ${textSecondary} uppercase`}>Steady State π</span>
                            </div>
                            <div className={`h-8 w-full ${bgProgress} rounded-xl overflow-hidden flex shadow-inner p-1`}>
                                <div className="bg-blue-400 h-full transition-all duration-1000 rounded-l-lg border-r border-white/20" style={{ width: `${insights.stationary.learning_load * 100}%` }}></div>
                                <div className={`${bgBadge} h-full transition-all duration-1000 border-r border-white/20`} style={{ width: `${insights.stationary.steady_mastery * 100}%` }}></div>
                                <div className="bg-gray-400 h-full transition-all duration-1000 rounded-r-lg" style={{ width: `${insights.stationary.filtered_proportion * 100}%` }}></div>
                            </div>
                            <div className="flex gap-6 mt-3 text-[10px] font-bold uppercase tracking-wider">
                                <div className="flex items-center gap-2 text-blue-500"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Load {Math.round(insights.stationary.learning_load * 100)}%</div>
                                <div className={`flex items-center gap-2 ${textAccent}`}><div className={`w-2 h-2 rounded-full ${bgBadge}`}></div> Mastery {Math.round(insights.stationary.steady_mastery * 100)}%</div>
                                <div className="flex items-center gap-2 text-gray-500"><div className="w-2 h-2 rounded-full bg-gray-400"></div> Filtered {Math.round(insights.stationary.filtered_proportion * 100)}%</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-sm">
                                <div className={`text-xl font-black ${textPrimary}`}>{insights.discoveryVelocity ? insights.discoveryVelocity.toFixed(1) : '0.0'}</div>
                                <div className={`text-[9px] font-bold ${textSecondary} uppercase`}>Disc./Day</div>
                            </div>
                            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-sm">
                                <div className={`text-xl font-black ${textPrimary}`}>{Math.round(insights.metrics.learning_success_rate)}%</div>
                                <div className={`text-[9px] font-bold ${textSecondary} uppercase`}>Success (pLK)</div>
                            </div>
                            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-sm">
                                <div className={`text-xl font-black ${textPrimary}`}>{Math.round(insights.metrics.forgetting_rate)}%</div>
                                <div className={`text-[9px] font-bold ${textSecondary} uppercase`}>Forget (pKL)</div>
                            </div>
                            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-sm">
                                <div className={`text-xl font-black ${textPrimary}`}>{Math.round(insights.metrics.learning_friction)}%</div>
                                <div className={`text-[9px] font-bold ${textSecondary} uppercase`}>Friction (pLL)</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
