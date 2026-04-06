import { Outlet, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './Header';
import { useReaderStore } from '../../store/useReaderStore';

export default function MainLayout() {
    const { lang } = useParams();
    const { languageCode, syncLanguageWithUrl } = useReaderStore();

    // Single source of truth: Sync store language with URL parameter
    useEffect(() => {
        if (lang && lang !== languageCode) {
            syncLanguageWithUrl(lang);
        }
    }, [lang, languageCode, syncLanguageWithUrl]);

    return (
        <div className="min-h-screen flex flex-col font-nunito bg-[#f3f4f6]">
            <Header />
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
}