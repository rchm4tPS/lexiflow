import { useLocation, useNavigate } from 'react-router-dom';
import { useReaderStore } from '../../store/useReaderStore';
import { Library, BookMarked, Layers, BarChart3, User } from 'lucide-react';

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { languageCode } = useReaderStore();
    const lang = languageCode || 'en';

    const path = location.pathname;

    const navItems = [
        {
            key: 'library',
            line1: 'Library',
            line2: 'Page',
            path: `/me/${lang}/library`,
            isActive: path.includes('/library') || path.includes('/course/'),
            icon: Library,
        },
        {
            key: 'my-lessons',
            line1: 'My Lesson',
            line2: 'Page',
            path: `/me/${lang}/my-lessons`,
            isActive: path.includes('/my-lessons'),
            icon: BookMarked,
        },
        {
            key: 'vocabulary',
            line1: 'Vocabulary',
            line2: 'Page',
            path: `/me/${lang}/vocabulary`,
            isActive: path.includes('/vocabulary'),
            icon: Layers,
        },
        {
            key: 'metrics',
            line1: 'Metrics',
            line2: 'Page',
            path: `/me/${lang}/metrics`,
            isActive: path.includes('/metrics'),
            icon: BarChart3,
        },
        {
            key: 'profile',
            line1: 'Profile &',
            line2: 'Settings',
            path: `/me/${lang}/profile`,
            isActive: path.includes('/profile'),
            icon: User,
        },
    ];

    // Hide bottom nav in reader view if needed, or keep everywhere except reader
    const isReaderPage = path.includes('/reader/');
    if (isReaderPage) return null;

    return (
        <nav className="xl:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 flex items-center justify-around px-1 shadow-[0_-4px_15px_rgba(0,0,0,0.06)]">
            {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                    <button
                        key={item.key}
                        onClick={() => navigate(item.path)}
                        className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-0.5 transition-all cursor-pointer relative ${
                            item.isActive
                                ? 'text-[#3890fc] font-black bg-blue-50/70 before:absolute before:top-0 before:left-0 before:right-0 before:h-1.5 before:bg-[#3890fc] before:rounded-b-full'
                                : 'text-gray-500 hover:text-gray-800 font-semibold hover:bg-gray-50/50'
                        }`}
                    >
                        <IconComponent className={`w-5 h-5 mb-0.5 ${item.isActive ? 'stroke-[2.5] text-[#3890fc]' : 'stroke-[1.8]'}`} />
                        <div className="flex flex-col items-center leading-[1.1] text-[9.5px] text-center">
                            <span>{item.line1}</span>
                            <span>{item.line2}</span>
                        </div>
                    </button>
                );
            })}
        </nav>
    );
}
