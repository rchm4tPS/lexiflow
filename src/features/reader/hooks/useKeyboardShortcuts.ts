import { useEffect } from 'react';
import { useReaderStore } from '../../../store/useReaderStore';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Token, Phrase } from '../../../types/reader';

export const useKeyboardShortcuts = () => {
    const { isAuthenticated } = useAuthStore();
    const { 
        selectedId, draftPhraseRange, tokens, phrases, currentPage, 
        clearSelection, navigateWord, navigatePhrase, updateStage,
        setPage, goToEdgePage, createPhrase, handlePageAdvance
    } = useReaderStore();

    useEffect(() => {
        if (!isAuthenticated) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle shortcuts if user is typing in an input/textarea
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return;
            }

            const isShift = e.shiftKey;
            const isAlt = e.altKey;

            const key = e.key.toLowerCase();
            
            // Determine what is actively selected
            let activeItem: (Token | Phrase | { isDraft: boolean; stage: number; range: string[]; id?: string }) | null = null;

            if (draftPhraseRange) {
                // Check if this highlight matches an existing saved phrase
                const existingPhrase = phrases.find(p =>
                    p.range.length === draftPhraseRange.length &&
                    p.range.every((id: string, idx: number) => id === draftPhraseRange[idx])
                );

                if (existingPhrase) {
                    activeItem = { ...existingPhrase };
                } else {
                    activeItem = { isDraft: true, stage: 0, range: draftPhraseRange };
                }
            }
            else if (selectedId?.includes('_')) {
                activeItem = phrases.find(p => p.id === selectedId) || null;
            }
            else if (selectedId) {
                activeItem = tokens.find(t => t.id === selectedId) || null;
            }

            // 1. Esc -> Deselect EVERYTHING
            if (e.key === 'Escape') {
                e.preventDefault();
                clearSelection();
            }

            if (/[0]/.test(e.key) && activeItem?.id) {
                updateStage({ id: activeItem.id, stage: 6 });
            }

            // 2. K -> Quick Promote to Stage 1
            if (key === 'k') {
                if (activeItem && 'isDraft' in activeItem && activeItem.isDraft) {
                    // It's a brand new highlight -> Create it
                    createPhrase(activeItem.range, "");
                } else if (activeItem && activeItem.id) {
                    // It's an existing phrase or word -> Promote it
                    updateStage({ id: activeItem.id, stage: 5 });
                }
            }

            // 3. Navigation
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const direction = e.key === 'ArrowRight' ? 'next' : 'prev';
                
                if (isAlt) {
                    // Alt + Arrows = Navigate Phrases
                    navigatePhrase(direction);
                } else {
                    // Normal/Shift Arrows = Navigate Tokens
                    navigateWord(direction, !isShift);
                }
            }

            // 4. Stage Changes (Up/Down / 1-6)
            if (activeItem && !('isDraft' in activeItem) && activeItem.id) {
                const currentStage = Number(activeItem.stage) || 0;
                
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    updateStage({ id: activeItem.id, stage: Math.min(currentStage + 1, 6) });
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    updateStage({ id: activeItem.id, stage: Math.max(currentStage - 1, 1) });
                }
                if (/[1-6]/.test(e.key)) {
                    updateStage({ id: activeItem.id, stage: parseInt(e.key) });
                }
            }

            // 5. Page Control
            if (isShift && key === 'a') setPage(Math.max(0, currentPage - 1));
            if (isShift && key === 'd') {
                const maxPage = Math.max(...tokens.map(t => t.pageIndex));
                handlePageAdvance(Math.min(maxPage, currentPage + 1));
            }

            // 6. Edge Navigation (W / S)
            if (!isShift && key === 'w') goToEdgePage('first');
            if (!isShift && key === 's') goToEdgePage('last');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        selectedId, draftPhraseRange, tokens, phrases, currentPage, isAuthenticated,
        clearSelection, navigateWord, navigatePhrase, updateStage, 
        setPage, goToEdgePage, createPhrase, handlePageAdvance
    ]);
};