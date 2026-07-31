import { useState, useRef, useEffect } from 'react';
import { useReaderStore } from '../store/useReaderStore';
import DailyGoalWidget from '../features/library/components/DailyGoalWidget';
import { LANG_MAP } from '../constants/languages';
import { useNavigate } from 'react-router-dom';

export default function MetricsView() {
    const {
        languageCode, totalKnownWords, totalStreaks, totalCoins,
        availableLanguages, enrolledLanguages, switchLanguage, recalculateStats
    } = useReaderStore();
    const navigate = useNavigate();

    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const langMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        recalculateStats();
    }, [recalculateStats, languageCode]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
                setIsLangMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const renderLanguageItem = (l: any) => (
        <div 
            key={l.code}
            onClick={async () => {
                setIsLangMenuOpen(false);
                if (l.code !== languageCode) {
                    await switchLanguage(l.code);
                }
                navigate(`/me/${l.code}/library`);
            }}
            className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${l.code === languageCode ? 'bg-blue-50/50 text-[#3890fc]' : ''}`}
        >
            <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-gray-50 flex items-center justify-center shadow-sm">
                    <img src={`https://flagcdn.com/${LANG_MAP[l.code]?.countryCode || 'us'}.svg`} alt={l.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-[15px]">{l.name}</span>
                    <span className="text-[11px] opacity-60 uppercase">{l.isRTL ? 'RTL Layout' : 'LTR Layout'}</span>
                </div>
            </div>
            {l.code === languageCode && <span className="text-xl">✓</span>}
        </div>
    );

    return (
        <div className="flex flex-col items-center w-full min-h-[calc(100vh-64px)] bg-[#f3f4f6] font-nunito p-4 xl:p-6">
            <div className="max-w-md xl:max-w-xl w-full flex flex-col gap-4">
                
                {/* TOP STATS PILL BANNER (Matched with Image 1 Mockup) */}
                <div className="w-full bg-[#2B60A3] text-white rounded-xl shadow-md p-2 flex items-center justify-between font-extrabold text-sm xl:text-base relative">
                    
                    {/* Language dropdown button */}
                    <div className="relative" ref={langMenuRef}>
                        <button
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            className="flex items-center gap-2 bg-white text-[#3890fc] px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <svg className="w-4 h-4 text-[#3890fc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
                            </svg>
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center shrink-0">
                                <img src={`https://flagcdn.com/${LANG_MAP[languageCode?.toLowerCase() || 'en']?.countryCode || 'us'}.svg`} alt={languageCode} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-gray-800 font-black">{totalKnownWords?.toLocaleString() || 0}</span>
                        </button>

                        {/* Dropdown Menu */}
                        {isLangMenuOpen && (
                            <div className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-2xl py-2 z-[60] border border-gray-200 text-gray-800 overflow-hidden">
                                <div className="max-h-[60vh] overflow-y-auto">
                                    {enrolledLanguages?.length > 0 && (
                                        <>
                                            <div className="px-4 py-2 text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b mb-1">
                                                My Languages
                                            </div>
                                            <div>
                                                {availableLanguages.filter(l => enrolledLanguages.includes(l.code)).map(renderLanguageItem)}
                                            </div>
                                        </>
                                    )}
                                    <div className="px-4 py-2 text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b mb-1 mt-2">
                                        Discover New Languages
                                    </div>
                                    <div>
                                        {availableLanguages.filter(l => !enrolledLanguages.includes(l.code)).map(renderLanguageItem)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Streak Count */}
                    <div className="flex items-center gap-1 text-green-400 px-3">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 11-2 0h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                        </svg>
                        <span>{totalStreaks}</span>
                    </div>

                    {/* Coins Count */}
                    <div className="flex items-center gap-1.5 px-3">
                        <div className="w-4 h-4 rounded-full bg-yellow-400 border border-white"></div>
                        <span>{(totalCoins || 0).toLocaleString()}</span>
                    </div>
                </div>

                {/* DAILY STREAK & GOALS WIDGET */}
                <div className="w-full">
                    <DailyGoalWidget />
                </div>
            </div>
        </div>
    );
}
