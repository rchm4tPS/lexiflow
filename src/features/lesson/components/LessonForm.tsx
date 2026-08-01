import { useState } from 'react';
import { LEVELS } from '../../../constants/levels';
import AudioTimestampEditor, { type TimestampEntry } from './AudioTimestampEditor';
import { useReaderStore } from '../../../store/useReaderStore';
import { useSlidingIndicator } from '../../../hooks/useSlidingIndicator';
import SlidingContent from '../../../components/ui/SlidingContent';
import type { Course } from '../../../types/reader';

interface LessonFormProps {
    title: string;
    setTitle: (title: string) => void;
    text: string;
    setText: (text: string) => void;
    activeTab: 'title-text' | 'timestamps' | 'resources' | 'clips';
    setActiveTab: (tab: 'title-text' | 'timestamps' | 'resources' | 'clips') => void;
    currentLang: { name: string; countryCode: string };
    selectedLevel: string;
    setSelectedLevel: (level: string) => void;
    selectedCourseId: string;
    setSelectedCourseId: (courseId: string) => void;
    allCourses: Course[];
    onShowCourseModal?: () => void;
    isEditMode?: boolean;
    audioSrc?: string | null;
    audioTimestamps?: TimestampEntry[];
    setAudioTimestamps?: (timestamps: TimestampEntry[]) => void;
}

export default function LessonForm({
    title, setTitle, text, setText,
    activeTab, setActiveTab,
    currentLang, selectedLevel, setSelectedLevel,
    selectedCourseId, setSelectedCourseId,
    allCourses, onShowCourseModal, isEditMode = false,
    audioSrc,
    audioTimestamps = [],
    setAudioTimestamps = () => {}
}: LessonFormProps) {
    const isRTL = useReaderStore(state => state.isRTL);
    const hasAudio = !!audioSrc;
    const [editorFontSize, setEditorFontSize] = useState<number>(16);
    const [editorFontFamily, setEditorFontFamily] = useState<string>('default');

    const activeFontStyle = {
        fontSize: `${editorFontSize}px`,
        ...(editorFontFamily !== 'default' ? { fontFamily: editorFontFamily } : {})
    };

    const tabOrder = ['title-text', 'timestamps', 'resources', 'clips'] as const;
    const lessonActiveIndex = tabOrder.indexOf(activeTab);

    const { containerRef, tabRef, indicatorStyle } = useSlidingIndicator({
        activeIndex: lessonActiveIndex,
        orientation: 'horizontal',
    });

    return (
        <div className="flex flex-col flex-grow min-h-[520px]">
            {/* Tabs */}
            <div ref={containerRef} className="relative flex gap-5 border-b border-gray-200 px-6 pt-3">
                {tabOrder.map((tab, i) => {
                    const isDisabled = tab === 'timestamps' && !hasAudio;
                    return (
                        <button
                            key={tab}
                            ref={tabRef(i)}
                            onClick={() => !isDisabled && setActiveTab(tab)}
                            disabled={isDisabled}
                            title={isDisabled ? "No audio attached to this lesson" : ""}
                            className={`pb-3 text-sm font-bold capitalize transition-colors ${
                                activeTab === tab
                                    ? 'text-gray-800'
                                    : isDisabled
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {tab === 'title-text' ? 'Title & Text' : tab === 'timestamps' ? 'Audio Timestamps' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    );
                })}
                {/* Sliding indicator */}
                <div
                    style={indicatorStyle}
                    className="bottom-0 h-0.5 bg-gray-800 rounded-t-full pointer-events-none"
                    aria-hidden="true"
                />
            </div>

            {/* Metadata Bar */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 flex-wrap">
                {/* Language (Read-only) */}
                <div className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 bg-gray-100 flex items-center gap-1.5 min-w-[110px] cursor-default">
                    <div className="w-5 h-4 rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
                        <img src={`https://flagcdn.com/${currentLang.countryCode}.svg`} alt={currentLang.name} className="w-full h-full object-cover" />
                    </div>
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
                <div className="flex items-center gap-1 flex-grow min-w-[150px]">
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 bg-gray-50 outline-none flex-grow"
                    >
                        <option value="">Course (None)</option>
                        {allCourses.map((c: Course) => (
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

                {/* Session Font Family Selector */}
                <select
                    value={editorFontFamily}
                    onChange={(e) => setEditorFontFamily(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 bg-gray-50 text-xs text-gray-700 outline-none shrink-0"
                    title="Select font family for editing session"
                >
                    <option value="default">Default Font</option>
                    <option value="'Nunito', sans-serif">Sans-Serif (Nunito)</option>
                    <option value="ui-serif, Georgia, serif">Serif</option>
                    <option value="ui-monospace, SFMono-Regular, monospace">Monospace</option>
                    <option value="'Parastoo', 'Tahoma', serif">Parastoo (Arabic/Farsi)</option>
                    <option value="'LingqFont', serif">Traditional Farsi</option>
                </select>

                {/* Session Font Size Adjuster */}
                <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-gray-50 text-xs text-gray-700 shrink-0">
                    <span className="font-bold text-gray-500 mr-1 select-none">Aa</span>
                    <button
                        type="button"
                        onClick={() => setEditorFontSize(prev => Math.max(12, prev - 2))}
                        className="w-5 h-5 flex items-center justify-center bg-white border border-gray-200 rounded font-bold hover:bg-gray-100 transition cursor-pointer"
                        title="Decrease text size"
                    >
                        -
                    </button>
                    <span className="font-mono text-xs font-bold w-8 text-center select-none">{editorFontSize}px</span>
                    <button
                        type="button"
                        onClick={() => setEditorFontSize(prev => Math.min(36, prev + 2))}
                        className="w-5 h-5 flex items-center justify-center bg-white border border-gray-200 rounded font-bold hover:bg-gray-100 transition cursor-pointer"
                        title="Increase text size"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <SlidingContent activeIndex={lessonActiveIndex} rtl={isRTL} className="flex-grow flex">
                {/* Title & Text Panel */}
                <div className="flex flex-col flex-grow">
                    <div className="px-6 pt-4">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            dir={isRTL ? 'rtl' : 'ltr'}
                            placeholder="Type the Title of your Lesson..."
                            className={`w-full text-xl font-bold text-gray-700 outline-none pb-2 border-b border-gray-100 focus:border-[#3890fc] transition-colors bg-transparent ${
                                isRTL && editorFontFamily === 'default' ? 'font-farsi-trad text-right' : (isRTL ? 'text-right' : 'text-left')
                            }`}
                            autoFocus={!isEditMode}
                        />
                    </div>

                    <div className="flex-grow px-6 pt-3 pb-4">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            dir={isRTL ? 'rtl' : 'ltr'}
                            style={activeFontStyle}
                            placeholder="Type the lesson text here..."
                            className={`w-full h-full min-h-[200px] resize-none outline-none text-gray-600 leading-relaxed bg-transparent ${
                                isRTL && editorFontFamily === 'default' ? 'font-farsi-trad text-right' : (isRTL ? 'text-right' : 'text-left')
                            }`}
                        />
                    </div>
                </div>

                {/* Timestamps Panel */}
                <div className="flex-grow p-6 flex flex-col">
                    {hasAudio ? (
                        <AudioTimestampEditor
                            audioSrc={audioSrc || null}
                            text={text}
                            onTextChange={setText}
                            timestamps={audioTimestamps}
                            onTimestampsChange={setAudioTimestamps}
                            editorFontSize={editorFontSize}
                            editorFontFamily={editorFontFamily}
                            isRTL={isRTL}
                        />
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-gray-400 p-8 border-2 border-dashed border-gray-200 rounded-xl">
                            <span className="text-3xl mb-2">🎵</span>
                            <p className="font-bold text-sm text-gray-600 mb-1">No Audio Attached</p>
                            <p className="text-xs text-gray-400 text-center max-w-sm">
                                Attach an audio file or audio URL in the sidebar to enable audio timestamp alignment for this lesson.
                            </p>
                        </div>
                    )}
                </div>

                {/* Resources Panel (placeholder) */}
                <div className="flex-grow flex flex-col items-center justify-center text-gray-400 p-8">
                    <span className="text-3xl mb-2">📚</span>
                    <p className="font-bold text-sm text-gray-600">Resources</p>
                    <p className="text-xs text-gray-400">Coming soon</p>
                </div>

                {/* Clips Panel (placeholder) */}
                <div className="flex-grow flex flex-col items-center justify-center text-gray-400 p-8">
                    <span className="text-3xl mb-2">🎬</span>
                    <p className="font-bold text-sm text-gray-600">Clips</p>
                    <p className="text-xs text-gray-400">Coming soon</p>
                </div>
            </SlidingContent>
        </div>
    );
}
