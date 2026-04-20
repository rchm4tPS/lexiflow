import { useState, useRef, useEffect } from 'react';
import { useReaderStore } from '../../store/useReaderStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Link, useParams, useNavigate } from 'react-router-dom';

export default function Header() {
    const {
        languageCode, totalKnownWords, totalStreaks,
        totalCoins, 
        // initializeUserState,setRTL,
        isRTL, recalculateStats,
        availableLanguages, fetchLanguages, switchLanguage
    } = useReaderStore();
    const { user } = useAuthStore();
    const { lang } = useParams();
    const navigate = useNavigate();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const langMenuRef = useRef<HTMLDivElement>(null);

    // If the URL language differs from the store, fetch statistics for the new target language.
    // This handles manual URL switches (e.g., from /me/es to /me/fr).
    useEffect(() => {
        if (user?.id && lang && lang !== languageCode) {
            recalculateStats(lang);
        }
    }, [lang, languageCode, user?.id, recalculateStats]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsImportOpen(false);
            if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) setIsLangMenuOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch languages on mount
    useEffect(() => {
        fetchLanguages();
    }, [fetchLanguages]);

    return (
        <header className="sticky top-0 bg-[#3890fc] text-white px-6 py-2.5 flex items-center w-full shadow-md z-50" onClick={(e) => e.stopPropagation()}>
            <div className="flex w-full max-w-400 mx-auto">
                <div className="flex items-center space-x-8">
                    <Link to={`/me/${languageCode || 'en'}/library`} className="text-4xl font-extrabold flex items-center cursor-pointer tracking-tight">
                        <svg className="w-8 h-8 mr-1" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
                        <p>Lexiflow <span className='text-yellow-300'></span></p>
                    </Link>
                    <nav className="flex space-x-8 text-[20px] font-bold">
                        <Link to={`/me/${languageCode || 'en'}/library`} className="border border-white/40 rounded-full px-4 py-1 bg-white/10">Lessons</Link>
                        <a href="#" className="opacity-90 hover:opacity-100 py-1">Tutors</a>
                        <a href="#" className="opacity-90 hover:opacity-100 py-1">Community</a>
                    </nav>
                </div>
                <div className="ml-auto flex items-center space-x-4 text-[18px] font-extrabold">
                    <div className="rounded-full flex gap-6 pr-8 bg-[#2B60A3] relative">
                        {/* LANGUAGE SELECTOR DROPDOWN */}
                        <div className="relative h-full" ref={langMenuRef}>
                            <button
                                className="flex h-full text-[#3890fc] bg-white rounded-tl-full rounded-bl-full py-1.5 pl-3 pr-4 items-center shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            >
                                <svg className="w-6 h-6 text-[#3890fc]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>

                                {/* LANGUAGE CODE INDICATOR CIRCLE */}
                                <div className={`w-8 h-8 rounded-full ${isRTL ? 'bg-red-500' : 'bg-green-500'} overflow-hidden border border-gray-300 mx-2 flex items-center justify-center text-white text-[14px] uppercase font-black animate-pulse shadow-inner`}>
                                    {languageCode}
                                </div>

                                <div className="flex flex-col items-start leading-tight">
                                    <span className="text-[16px]">{totalKnownWords?.toLocaleString() || 0}</span>
                                </div>
                            </button>

                            {/* DROPDOWN MENU */}
                            {isLangMenuOpen && (
                                <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-2xl py-2 z-[60] border border-gray-200 text-gray-800 overflow-hidden">
                                    <div className="px-4 py-2 text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b mb-1">
                                        Switch Language
                                    </div>
                                    {availableLanguages.map(l => (
                                        <div 
                                            key={l.code}
                                            onClick={async () => {
                                                setIsLangMenuOpen(false);
                                                if (l.code !== languageCode) {
                                                    await switchLanguage(l.code);
                                                    navigate(`/me/${l.code}/library`);
                                                }
                                            }}
                                            className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${l.code === languageCode ? 'bg-blue-50/50 text-[#3890fc]' : ''}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[15px]">{l.name}</span>
                                                <span className="text-[11px] opacity-60 uppercase">{l.isRTL ? 'RTL Layout' : 'LTR Layout'}</span>
                                            </div>
                                            {l.code === languageCode && <span className="text-xl">✓</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center py-2 mr-4">
                            <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" /></svg> {totalStreaks}
                        </div>
                        {/* COINS WITH TOOLTIP & CLICK TO RECALCULATE */}
                        <div
                            className="relative group flex items-center cursor-help hover:bg-black/10 px-2"
                            onClick={() => recalculateStats()}
                        >
                            <div className="w-5 h-5 mr-2 rounded-full bg-yellow-400 border-2 border-white"></div>
                            <span>{
                                (totalCoins || 0) < 1000
                                    ? (totalCoins || 0)
                                    : ((totalCoins || 0) / 1000).toFixed(1) + ' K'
                            }</span>

                            {/* TOOLTIP: Hidden by default, visible on parent group hover */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-50">
                                {(totalCoins || 0).toLocaleString()} Coins
                                {/* Arrow */}
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                            </div>
                        </div>
                    </div>
                    {/*<button className="bg-[#FCB817] text-white px-4 py-2 rounded-full text-sm flex items-center shadow-sm hover:bg-yellow-400">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg> GET PREMIUM
                            </button>*/}
                    <Link
                        to={`/me/${languageCode || 'en'}/profile`}
                        className="w-11 h-11 bg-white rounded-full flex items-center justify-center overflow-hidden cursor-pointer border-4 border-[#0469E6] hover:scale-105 transition-transform"
                        title="View Profile"
                    >
                        <svg className="w-12 h-12 text-[#47AFE9]" fill="#47AFE9" stroke="currentColor" viewBox="0 -2 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </Link>
                    {/* NEW IMPORT DROPDOWN */}
                    <div className="relative" ref={dropdownRef}>
                        <div
                            onClick={() => setIsImportOpen(!isImportOpen)}
                            className="w-9 h-9 bg-white text-[#3890fc] rounded flex items-center justify-center cursor-pointer text-3xl font-extrabold pb-1 shadow-sm hover:bg-gray-100"
                        >
                            +
                        </div>
                        {isImportOpen && (
                            <div className="absolute right-0 mt-3 w-48 bg-white rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.15)] py-2 z-50 text-gray-700 text-[15px] font-bold border border-gray-200">
                                <Link
                                    to={`/me/${languageCode || 'en'}/import`}
                                    onClick={() => setIsImportOpen(false)}
                                    className="block px-4 py-2 hover:bg-[#eef9ff] hover:text-[#3890fc]"
                                >
                                    Import Lesson
                                </Link>
                                {/* <a href="#" className="block px-4 py-2 hover:bg-[#eef9ff] hover:text-[#3890fc]">Import Vocabulary</a>
                                <a href="#" className="block px-4 py-2 hover:bg-[#eef9ff] hover:text-[#3890fc]">Import Ebook</a> */}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}