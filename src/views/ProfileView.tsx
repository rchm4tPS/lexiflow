import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useReaderStore } from '../store/useReaderStore';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import type { MarkovInsights, UserStats } from '../types/reader';

import MarkovInsightsCard from '../features/profile/components/MarkovInsightsCard';
import { StatCard, SmallStat } from '../features/profile/components/StatCards';

/** API returns daily rows; profile cards need period totals (same shape as DailyGoalWidget). */
function aggregatePeriodStats(rows: UserStats[] | undefined) {
    if (!rows?.length) return { created: 0, learned: 0, words: 0, listening: 0 };
    return rows.reduce(
        (acc, curr) => ({
            created: acc.created + (Number(curr.created) || 0),
            learned: acc.learned + (Number(curr.learned) || 0),
            words: acc.words + (Number(curr.words) || 0),
            listening: acc.listening + (Number(curr.listening) || 0),
        }),
        { created: 0, learned: 0, words: 0, listening: 0 }
    );
}

type StatsType = {
    fullName: string;
    username?: string;
    knownWords: number;
    totalLingQs: number;
    totalStreaks: number;
    totalCoins: number;
    stats7d: UserStats[];
    stats30d: UserStats[];
}

type InsightsType = {
  vocab: MarkovInsights;
  phrase: MarkovInsights;
};

export default function ProfileView() {
    const { user, logout } = useAuthStore();
    const [stats, setStats] = useState<StatsType | null>(null);
    const [insights, setInsights] = useState<InsightsType | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const { languageCode } = useReaderStore();

    useEffect(() => {
        if (!user?.id) return;
        setLoading(true);
        const langQ = languageCode ? `?lang=${encodeURIComponent(languageCode)}` : '';
        Promise.all([
            apiClient(`/auth/info/${user.id}${langQ}`),
            apiClient(`/auth/profile/insights/${user.id}`),
        ])
            .then(([data, insightData]) => {
                setStats(data);
                setInsights(insightData);
            })
            .catch((err) => {
                console.error('Failed to fetch profile info', err);
            })
            .finally(() => setLoading(false));
    }, [user?.id, languageCode]);

    const handleResetLanguageData = async () => {
        const lang = languageCode || 'en';
        
        const result = await Swal.fire({
            title: 'Irreversible Action!',
            text: `This will permanently DELETE all your LingQs, phrases, history, and course progress for ${lang.toUpperCase()}. You will start from zero.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Yes, I understand'
        });
        
        if (result.isConfirmed) {
            const secondConfirm = await Swal.fire({
                title: 'Final Confirmation',
                text: "Are you absolutely sure? This cannot be undone by support or any automated tool.",
                icon: 'error',
                showCancelButton: true,
                confirmButtonText: 'RESET EVERYTHING',
                confirmButtonColor: '#ef4444',
            });
            
            if (secondConfirm.isConfirmed) {
                try {
                    setLoading(true);
                    await apiClient(`/auth/profile/reset/${lang}`, { method: 'POST' });
                    
                    await Swal.fire({
                        title: 'Reset Complete',
                        text: `Your ${lang.toUpperCase()} progress has been zeroed out.`,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    
                    window.location.reload(); 
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    Swal.fire('Error', 'Reset failed: ' + message, 'error');
                    setLoading(false);
                }
            }
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full font-nunito text-gray-500 font-bold">Loading Profile...</div>;

    const totals7d = aggregatePeriodStats(stats?.stats7d);
    const totals30d = aggregatePeriodStats(stats?.stats30d);

    const displayName =
        stats?.fullName || user?.fullName || stats?.username || user?.username || 'Member';
    const displayUsername = stats?.username || user?.username;
    const initial = (displayName || '?').trim().charAt(0).toUpperCase() || '?';

    return (
        <div className="max-w-4xl mx-auto p-8 font-nunito">
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100">
                <div className="flex items-center gap-6 mb-8">
                    <span className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-md">
                        {initial}
                    </span>
                    <div className=''>
                        <span className="text-3xl font-black text-gray-800">{displayName}</span>
                        {displayUsername ? (
                            <span className="text-sm font-bold text-gray-400">{` (@${displayUsername})`}</span>
                        ) : null}
                        {user?.email ? (
                            <p className="text-gray-500 font-medium">{user.email}</p>
                        ) : null}
                    </div>
                    <div className="ml-auto">
                        <button 
                            onClick={handleLogout}
                            className="bg-red-50 text-red-600 px-6 py-2 rounded-full font-bold hover:bg-red-100 transition shadow-sm border border-red-100"
                        >
                            Log Out
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
                    <StatCard label="Known Words" value={stats?.knownWords} color="text-green-600" />
                    <StatCard label="LingQs" value={stats?.totalLingQs} color="text-yellow-600" />
                    <StatCard label="Streak" value={`${stats?.totalStreaks || 0} days`} color="text-orange-600" />
                    <StatCard label="Coins" value={stats?.totalCoins} color="text-yellow-500" />
                </div>

                {/* --- MARKOV LEARNING DYNAMICS --- */}
                {insights && (
                    <div className="space-y-10 mb-12">
                        <MarkovInsightsCard 
                            title="Word Learning Dynamics" 
                            insights={insights.vocab} 
                            colorClass="indigo"
                        />
                        <MarkovInsightsCard 
                            title="Phrase Learning Dynamics" 
                            insights={insights.phrase} 
                            colorClass="teal"
                            isPhrase
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 shadow-inner">
                        <h2 className="text-xl font-black mb-4 text-gray-700">Last 7 Days</h2>
                        <div className="space-y-3">
                            <SmallStat label="New LingQs" value={totals7d.created} />
                            <SmallStat label="Known Words" value={totals7d.learned} />
                            <SmallStat label="Words Read" value={totals7d.words} />
                            <SmallStat label="Listening" value={`${(totals7d.listening / 60).toFixed(2)} min`} />
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 shadow-inner">
                        <h2 className="text-xl font-black mb-4 text-gray-700">Last 30 Days</h2>
                        <div className="space-y-3">
                            <SmallStat label="New LingQs" value={totals30d.created} />
                            <SmallStat label="Known Words" value={totals30d.learned} />
                            <SmallStat label="Words Read" value={totals30d.words} />
                            <SmallStat label="Listening" value={`${(totals30d.listening / 60).toFixed(2)} min`} />
                        </div>
                    </div>
                </div>

                {/* --- DANGER ZONE --- */}
                <div className="mt-12 pt-8 border-t border-red-100">
                    <h3 className="text-lg font-black text-red-900 mb-2">Danger Zone</h3>
                    <p className="text-sm text-red-500 mb-6 font-bold">Reset all your progress, words, and history for your current target language. Irreversible action.</p>
                    
                    <button 
                        onClick={handleResetLanguageData}
                        className="bg-white text-red-600 border border-red-200 px-6 py-3 rounded-xl font-black hover:bg-red-50 transition shadow-sm flex items-center gap-2 group"
                    >
                        <span className="group-hover:animate-pulse text-xl">☢️</span>
                        Reset {languageCode?.toUpperCase()} Progress
                    </button>
                </div>
            </div>
        </div>
    );
}
