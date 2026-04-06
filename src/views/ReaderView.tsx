import { useParams } from "react-router-dom";
import { useReaderStore } from "../store/useReaderStore";
import { useKeyboardShortcuts } from "../features/reader/hooks/useKeyboardShortcuts";
import { useEffect, useMemo } from "react";
import Toolbar from "../features/reader/components/Toolbar";
import ReaderPane from "../features/reader/components/ReaderPane";
import Sidebar from "../features/reader/components/Sidebar";
import CompletionModal from "../features/reader/components/LessonEnd/CompletionModal";
import type { SidebarItem } from "../types/reader";

export default function ReaderView() {
    const { lessonId } = useParams();

    const {
        fetchLesson, syncLessonProgress,
        // courseLevel
        courseTitle, lessonTitle, lessonImg,
        tokens, phrases,
        selectedId, draftPhraseRange,
        updateStage, createPhrase,
        clearSelection,
        showSummary, showModal
    } = useReaderStore();

    useKeyboardShortcuts();

    useEffect(() => {
        if (lessonId) fetchLesson(lessonId);

        // CLEANUP FUNCTION: Runs when the user leaves this page!
        return () => {
            if (lessonId) {
                // Sync reading progress but NEVER reset is_completed back to false.
                // Pass undefined so the backend preserves the existing completed flag.
                syncLessonProgress(lessonId);
            }
        };
    }, [fetchLesson, lessonId, syncLessonProgress]);

    // Compute activeItem for Sidebar
    const activeItem = useMemo(() => {
        if (draftPhraseRange) {
            // 1. Check if this highlight matches an existing phrase
            const existingPhrase = phrases.find(p =>
                p.range.length === draftPhraseRange.length && 
                p.range.every((id: string, idx: number) => id === draftPhraseRange[idx])
            );

            if (existingPhrase) return { ...existingPhrase, isPhrase: true as const };

            // 2. Otherwise, it's a new Blue Draft
            const phraseTokens = tokens.filter(t => draftPhraseRange.includes(t.id));
            return {
                isDraft: true as const,
                text: phraseTokens.map(t => t.text).join(' '),
                stage: 0,
                range: draftPhraseRange,
                isPhrase: false as const
            } as SidebarItem;
        }

        if (selectedId) {
            if (selectedId.includes('_')) {
                const p = phrases.find(p => p.id === selectedId);
                return (p ? { ...p, isPhrase: true as const } : null) as SidebarItem | null;
            }
            return (tokens.find(t => t.id === selectedId) || null) as SidebarItem | null;
        }
        return null;
    }, [selectedId, draftPhraseRange, tokens, phrases]);

    if (tokens.length === 0) {
        return <div className="h-full flex items-center justify-center font-bold text-gray-400">Loading Lesson Content...</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] max-w-350 w-full mx-auto px-4 py-4" onClick={clearSelection}>
            {showModal && <CompletionModal />}
            <Toolbar />
            <div className="flex grow bg-white shadow-lg border border-gray-200 rounded-b-lg overflow-hidden">
                <ReaderPane
                    courseTitle={courseTitle}
                    lessonTitle={lessonTitle}
                    lessonImg={lessonImg}
                />
                {!showSummary && (
                    <Sidebar word={activeItem} onUpdateStage={updateStage} onCreatePhrase={createPhrase} />
                )}
            </div>
        </div>
    );
}