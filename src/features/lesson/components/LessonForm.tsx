import { LEVELS } from '../../../constants/levels';

interface LessonFormProps {
    title: string;
    setTitle: (title: string) => void;
    text: string;
    setText: (text: string) => void;
    activeTab: 'title-text' | 'resources' | 'clips';
    setActiveTab: (tab: 'title-text' | 'resources' | 'clips') => void;
    currentLang: { name: string; flag: string };
    selectedLevel: string;
    setSelectedLevel: (level: string) => void;
    selectedCourseId: string;
    setSelectedCourseId: (courseId: string) => void;
    allCourses: any[];
    onShowCourseModal?: () => void;
    isEditMode?: boolean;
}

export default function LessonForm({
    title, setTitle, text, setText,
    activeTab, setActiveTab,
    currentLang, selectedLevel, setSelectedLevel,
    selectedCourseId, setSelectedCourseId,
    allCourses, onShowCourseModal, isEditMode = false
}: LessonFormProps) {
    return (
        <div className="flex flex-col flex-grow min-h-[520px]">
            {/* Tabs */}
            <div className="flex gap-5 border-b border-gray-200 px-6 pt-3">
                {(['title-text', 'resources', 'clips'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-bold capitalize transition-colors border-b-2 -mb-px ${
                            activeTab === tab ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        {tab === 'title-text' ? 'Title & Text' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Metadata Bar */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100">
                {/* Language (Read-only) */}
                <div className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 bg-gray-100 flex items-center gap-1.5 min-w-[110px] cursor-default">
                    <span>{currentLang.flag}</span>
                    <span>{currentLang.name}</span>
                </div>

                {/* Level Select */}
                <select
                    value={selectedLevel}
                    onChange={(e) => !selectedCourseId && setSelectedLevel(e.target.value)}
                    disabled={!!selectedCourseId}
                    title={selectedCourseId ? "Level is inherited from the selected course." : ""}
                    className={`border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 outline-none min-w-[130px] ${
                        selectedCourseId ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'bg-gray-50'
                    }`}
                >
                    <option value="">{allCourses.length === 0 ? 'No courses yet' : 'Choose Level...'}</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>

                {/* Course Select */}
                <div className="flex items-center gap-1 flex-grow">
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 bg-gray-50 outline-none flex-grow"
                    >
                        <option value="">Course (None)</option>
                        {allCourses.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                    </select>
                    {!isEditMode && onShowCourseModal && (
                        <button
                            onClick={onShowCourseModal}
                            className="w-7 h-7 flex items-center justify-center text-[#3890fc] font-black text-lg hover:bg-blue-50 rounded transition-colors"
                        >
                            +
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'title-text' ? (
                <>
                    <div className="px-6 pt-4">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Type the Title of your Lesson..."
                            className="w-full text-xl font-bold text-gray-700 outline-none pb-2 border-b border-gray-100 focus:border-[#3890fc] transition-colors bg-transparent"
                            autoFocus={!isEditMode}
                        />
                    </div>

                    <div className="flex-grow px-6 pt-3 pb-4">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type the lesson text here..."
                            className="w-full h-full min-h-[200px] resize-none outline-none text-sm text-gray-600 leading-relaxed bg-transparent"
                        />
                    </div>
                </>
            ) : (
                <div className="flex-grow flex items-center justify-center text-gray-400 italic">
                    {activeTab} content coming soon...
                </div>
            )}
        </div>
    );
}
