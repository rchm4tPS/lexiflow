import { Outlet, useParams, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import { useReaderStore } from '../../store/useReaderStore';

export default function MainLayout() {
    const { lang } = useParams();
    const location = useLocation();
    const { languageCode, syncLanguageWithUrl } = useReaderStore();
    const isReaderPage = location.pathname.includes('/reader/');
    const mainRef = useRef<HTMLElement>(null);

    // Single source of truth: Sync store language with URL parameter
    useEffect(() => {
        if (lang && lang !== languageCode) {
            syncLanguageWithUrl(lang);
        }
    }, [lang, languageCode, syncLanguageWithUrl]);

    // Reset scroll position of <main> scroll container on route change
    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
    }, [location.pathname, location.search]);

    return (
        <div className="h-[100dvh] flex flex-col font-nunito bg-[#f3f4f6] overflow-hidden">
            <Header />
            <main ref={mainRef} className={`flex-1 overflow-y-auto ${isReaderPage ? 'pb-0' : 'pb-16 xl:pb-0'}`}>
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
}