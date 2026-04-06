import { useNavigate } from 'react-router-dom';

interface VocabTabsProps {
    languageCode: string;
    activeTab: 'All' | 'Phrases';
    onTabChange: () => void;
}

export default function VocabTabs({ languageCode, activeTab, onTabChange }: VocabTabsProps) {
    const navigate = useNavigate();

    return (
        <div className="flex border-b border-gray-200 mb-4 font-bold text-gray-500">
            <div 
                onClick={() => { navigate(`/me/${languageCode}/vocabulary`); onTabChange(); }}
                className={`px-10 py-2 cursor-pointer rounded-t-sm transition-colors ${activeTab === 'All' ? 'border-b-4 border-[#3890fc] bg-[#3890fc] text-white' : 'hover:text-[#3890fc] hover:bg-gray-50'}`}>
                Words
            </div>
            <div 
                onClick={() => { navigate(`/me/${languageCode}/vocabulary/phrases`); onTabChange(); }}
                className={`px-10 py-2 cursor-pointer rounded-t-sm transition-colors ${activeTab === 'Phrases' ? 'border-b-4 border-[#3890fc] bg-[#3890fc] text-white' : 'hover:text-[#3890fc] hover:bg-gray-50'}`}>
                Phrases
            </div>
        </div>
    );
}
