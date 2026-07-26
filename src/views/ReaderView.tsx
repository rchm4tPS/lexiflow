import { useParams } from "react-router-dom";
import { useShallow } from 'zustand/react/shallow';
import { useReaderStore } from "../store/useReaderStore";
import { useKeyboardShortcuts } from "../features/reader/hooks/useKeyboardShortcuts";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Toolbar from "../features/reader/components/Toolbar";
import ReaderPane from "../features/reader/components/ReaderPane";
import Sidebar from "../features/reader/components/Sidebar";
import CompletionModal from "../features/reader/components/LessonEnd/CompletionModal";
import LessonInfoModal from "../features/reader/components/LessonInfoModal";

export default function ReaderView() {
    const { lessonId } = useParams();
    const [isDrawerClosing, setIsDrawerClosing] = useState(false);
    const [dragY, setDragY] = useState(0);
    const dragStartY = useRef<number | null>(null);

    const {
        fetchLesson, syncLessonProgress,
        courseId, courseTitle, lessonTitle, lessonImg,
        updateStage, createPhrase,
        clearSelection,
        showSummary, showModal, showLessonInfoModal, setShowLessonInfoModal,
        isSidebarVisible, isLoadingLesson, lessonStructureHash,
        showTranslation, translationData, isLoadingTranslation, translationError, setShowTranslation
    } = useReaderStore(useShallow(state => ({
        fetchLesson: state.fetchLesson, syncLessonProgress: state.syncLessonProgress,
        courseId: state.courseId, courseTitle: state.courseTitle, lessonTitle: state.lessonTitle, lessonImg: state.lessonImg,
        updateStage: state.updateStage, createPhrase: state.createPhrase,
        clearSelection: state.clearSelection,
        showSummary: state.showSummary, showModal: state.showModal, showLessonInfoModal: state.showLessonInfoModal, setShowLessonInfoModal: state.setShowLessonInfoModal,
        isSidebarVisible: state.isSidebarVisible, isLoadingLesson: state.isLoadingLesson, lessonStructureHash: state.lessonStructureHash,
        showTranslation: state.showTranslation,
        translationData: state.translationData,
        isLoadingTranslation: state.isLoadingTranslation,
        translationError: state.translationError,
        setShowTranslation: state.setShowTranslation
    })));

    useKeyboardShortcuts();

    useEffect(() => {
        if (lessonId) fetchLesson(lessonId);

        // CLEANUP FUNCTION: Runs when the user leaves this page!
        return () => {
            if (lessonId) {
                // Sync reading progress but NEVER reset is_completed back to false.
                // Pass undefined so the backend preserves the existing completed flag.
                // We pass `true` as the fourth parameter to trigger stats recalculation.
                syncLessonProgress(lessonId, undefined, false, true);
                useReaderStore.getState().clearLessonSession();
            }
        };
    }, [fetchLesson, lessonId, syncLessonProgress]);

    const handleCloseTranslation = () => {
        setIsDrawerClosing(true);
        setTimeout(() => {
            setShowTranslation(false);
            setIsDrawerClosing(false);
        }, 280);
    };

    const handleDragStart = (clientY: number) => dragStartY.current = clientY;
    const handleDragMove = (clientY: number) => {
        if (dragStartY.current === null) return;
        const diff = clientY - dragStartY.current;
        if (diff > 0) setDragY(diff);
    };
    const handleDragEnd = () => {
        if (dragStartY.current === null) return;
        if (dragY > 80) handleCloseTranslation();
        dragStartY.current = null;
        setDragY(0);
    };

    if (isLoadingLesson || !lessonStructureHash) {
        return <div className="h-full flex items-center justify-center font-bold text-gray-400">Loading Lesson Content...</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100dvh-48px)] lg:h-[calc(100vh-64px)] max-w-7xl w-full mx-auto p-0 lg:p-4" onClick={clearSelection}>
            {showModal && <CompletionModal />}
            {showLessonInfoModal && <LessonInfoModal onClose={() => setShowLessonInfoModal(false)} />}
            <div className="order-2 lg:order-1 z-20"><Toolbar /></div>
            <div className="order-1 lg:order-2 flex flex-row grow min-h-0 bg-white lg:shadow-lg lg:border border-gray-200 lg:rounded-lg overflow-hidden relative">
                <ReaderPane
                    courseId={courseId}
                    courseTitle={courseTitle}
                    lessonTitle={lessonTitle}
                    lessonImg={lessonImg}
                />
            {!showSummary && (isSidebarVisible || showTranslation) && (
                <Sidebar
                    onUpdateStage={updateStage}
                    onCreatePhrase={createPhrase}
                    showTranslation={showTranslation}
                    translationData={translationData}
                    isLoadingTranslation={isLoadingTranslation}
                    translationError={translationError}
                    onCloseTranslation={handleCloseTranslation}
                />
            )}
            </div>

            {/* Translation Drawer — shown on viewports < xl (1280px) when sidebar is not visible */}
            {showTranslation && (
                <div
                    className={`xl:hidden fixed inset-0 z-[110] bg-black/60 flex items-end justify-center ${isDrawerClosing ? 'animate-fade-out-drawer' : 'animate-fade-in-drawer'}`}
                    onClick={handleCloseTranslation}
                >
                    <div
                        className={`w-full max-w-2xl ${isDrawerClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div
                            className="bg-white w-full max-h-[75vh] rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
                            style={{
                                transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
                                transition: dragY > 0 ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                        >
                            {/* Drawer Handle */}
                            <div
                                className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
                                style={{ touchAction: 'none' }}
                                onTouchStart={e => handleDragStart(e.touches[0].clientY)}
                                onTouchMove={e => handleDragMove(e.touches[0].clientY)}
                                onTouchEnd={handleDragEnd}
                                onMouseDown={e => handleDragStart(e.clientY)}
                                onMouseMove={e => handleDragMove(e.clientY)}
                                onMouseUp={handleDragEnd}
                                onMouseLeave={handleDragEnd}
                            >
                                <div className="w-10 h-1 rounded-full bg-gray-300" />
                            </div>
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                                <h3 className="font-extrabold text-lg text-[#3a92fb]">Translation</h3>
                                <button
                                    onClick={handleCloseTranslation}
                                    className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-5 py-4">
                                {isLoadingTranslation ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="h-5 bg-gray-200 animate-shimmer rounded w-full" />
                                        ))}
                                    </div>
                                ) : translationError ? (
                                    <div className="text-red-500 text-sm">{translationError}</div>
                                ) : (
                                    <div className="text-gray-800 text-[15px] leading-relaxed font-medium">
                                        {(translationData ?? []).map((sentence: string, idx: number) => (
                                            <p key={idx} className="mb-3">{sentence}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}