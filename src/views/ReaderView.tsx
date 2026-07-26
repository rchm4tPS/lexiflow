import { useParams } from "react-router-dom";
import { useShallow } from 'zustand/react/shallow';
import { useReaderStore } from "../store/useReaderStore";
import { useKeyboardShortcuts } from "../features/reader/hooks/useKeyboardShortcuts";
import { useEffect } from "react";
import Toolbar from "../features/reader/components/Toolbar";
import ReaderPane from "../features/reader/components/ReaderPane";
import Sidebar from "../features/reader/components/Sidebar";
import CompletionModal from "../features/reader/components/LessonEnd/CompletionModal";
import LessonInfoModal from "../features/reader/components/LessonInfoModal";

export default function ReaderView() {
    const { lessonId } = useParams();

    const {
        fetchLesson, syncLessonProgress,
        courseId, courseTitle, lessonTitle, lessonImg,
        updateStage, createPhrase,
        clearSelection,
        showSummary, showModal, showLessonInfoModal, setShowLessonInfoModal,
        isSidebarVisible, isLoadingLesson, lessonStructureHash
    } = useReaderStore(useShallow(state => ({
        fetchLesson: state.fetchLesson, syncLessonProgress: state.syncLessonProgress,
        courseId: state.courseId, courseTitle: state.courseTitle, lessonTitle: state.lessonTitle, lessonImg: state.lessonImg,
        updateStage: state.updateStage, createPhrase: state.createPhrase,
        clearSelection: state.clearSelection,
        showSummary: state.showSummary, showModal: state.showModal, showLessonInfoModal: state.showLessonInfoModal, setShowLessonInfoModal: state.setShowLessonInfoModal,
        isSidebarVisible: state.isSidebarVisible, isLoadingLesson: state.isLoadingLesson, lessonStructureHash: state.lessonStructureHash
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
                {!showSummary && isSidebarVisible && (
                    <Sidebar onUpdateStage={updateStage} onCreatePhrase={createPhrase} />
                )}
            </div>
        </div>
    );
}