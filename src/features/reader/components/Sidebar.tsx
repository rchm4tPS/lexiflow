import React from 'react';
import { X } from 'lucide-react';
import QuickStartGuide from './QuickStartGuide';
import BlueWordView from './BlueWordView';
import YellowWordView from './YellowWordView';
import type { SidebarItem, UpdatePayload } from '../../../types/reader';
import { useShallow } from 'zustand/react/shallow';
import { useReaderStore } from '../../../store/useReaderStore';

interface SidebarProps {
    onUpdateStage: (payload: UpdatePayload) => void;
    onCreatePhrase: (range: string[], meaning: string) => void;
    showTranslation?: boolean;
    translationData?: string[];
    isLoadingTranslation?: boolean;
    translationError?: string | null;
    onCloseTranslation?: () => void;
}

export default function Sidebar({
    onUpdateStage,
    onCreatePhrase,
    showTranslation,
    translationData,
    isLoadingTranslation,
    translationError,
    onCloseTranslation,
}: SidebarProps) {
    const { sidebarPosition, clickPos } = useReaderStore(useShallow(state => ({
        sidebarPosition: state.sidebarPosition,
        clickPos: state.clickPos
    })));

    const word = useReaderStore(state => {
        if (state.draftPhraseRange) {
            const wordTokenIds = state.draftPhraseRange.filter(id => {
                const t = state.tokenMap[id];
                return t && !t.isNewline && !!t.text.match(/\p{L}/u);
            });
            const existingPhrase = Object.values(state.phraseMap).find(p =>
                p.range.length === wordTokenIds.length &&
                p.range.every((id: string, idx: number) => id === wordTokenIds[idx])
            );
            if (existingPhrase) return { ...existingPhrase, isPhrase: true as const };

            const phraseTokens = state.draftPhraseRange.map(id => state.tokenMap[id]).filter(Boolean);
            return {
                isDraft: true as const,
                text: phraseTokens.map(t => t.text).join(' '),
                stage: 0,
                range: state.draftPhraseRange,
                isPhrase: false as const
            } as SidebarItem;
        }

        if (state.selectedId) {
            if (state.selectedId.includes('_')) {
                const p = state.phraseMap[state.selectedId];
                return (p ? { ...p, isPhrase: true as const } : null) as SidebarItem | null;
            }
            return (state.tokenMap[state.selectedId] || null) as SidebarItem | null;
        }
        return null;
    });
    // FIX: Safely coerce the stage to a Number, defaulting to 0.
    // This catches instances where JSON/State causes stage to be undefined or a string
    const currentStage = word ? Number(word.stage || 0) : 0;

    let dynamicStyle: React.CSSProperties = {};
    if (word && window.innerWidth < 1024) {
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const paneW = 320;
        const paneH = 400; // estimated max height

        let x, y;
        if (clickPos) {
            // Try placing it slightly below and right of the click
            x = clickPos.x + 15;
            if (x + paneW > screenW) x = clickPos.x - paneW - 15;
            x = Math.max(10, Math.min(x, screenW - paneW - 10));

            y = clickPos.y + 15;
            if (y + paneH > screenH) y = clickPos.y - paneH - 15;
            y = Math.max(10, Math.min(y, screenH - paneH - 10));
        } else {
            // Fallback to center if no click pos (e.g. keyboard navigation)
            x = (screenW - paneW) / 2;
            y = (screenH - paneH) / 2;
        }

        dynamicStyle = {
            position: 'fixed',
            top: `${y}px`,
            left: `${x}px`,
            width: `${paneW}px`,
            maxHeight: `calc(100dvh - ${y + 10}px)`,
            zIndex: 100,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            borderRadius: '0.75rem',
        };
    }

    const isDynamicOverlay = Object.keys(dynamicStyle).length > 0;

    const baseClasses = isDynamicOverlay
        ? "flex flex-col min-h-0 bg-white overflow-hidden border border-gray-200"
        : "w-full lg:w-[350px] xl:w-[400px] shrink-0 h-auto lg:h-full min-h-0 bg-white lg:bg-transparent xl:bg-white flex-col border-t xl:border-t-0 xl:border-l border-gray-200 lg:border-transparent xl:border-gray-200 overflow-hidden z-[60] xl:z-10 transition-all";

    const positionClasses = isDynamicOverlay ? "" : "lg:absolute lg:top-0 lg:bottom-0 xl:relative";
    const sideClasses = isDynamicOverlay ? "" : (sidebarPosition === 'left' ? 'lg:left-0' : 'lg:right-0');
    // Sidebar is hidden on mobile/tablet (<xl) unless a word is actively selected.
    // Translation on <xl is handled by the drawer in ReaderView instead.
    const visibilityClasses = !word ? 'hidden xl:flex' : 'flex';

    return (
        <div className={`${baseClasses} ${positionClasses} ${sideClasses} ${visibilityClasses}`}
            style={dynamicStyle}
            onClick={(e) => {
                // On medium screens, clicking the transparent wrapper should bubble up and dismiss the overlay.
                if (window.innerWidth >= 1024 && window.innerWidth < 1280 && e.target === e.currentTarget) {
                    return;
                }
                e.stopPropagation();
            }}>
            {!word && !showTranslation && <QuickStartGuide />}

            {/* Translation View */}
            {showTranslation && (
                <div className="flex flex-col h-full min-h-0 bg-white overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
                        <h3 className="font-extrabold text-lg text-[#3a92fb]">Translation</h3>
                        <button
                            onClick={onCloseTranslation}
                            className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {isLoadingTranslation ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-10 bg-gray-200 animate-shimmer rounded w-full" />
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
            )}

            {/* Logic: stage 0 is blue */}
            {!showTranslation && word && currentStage === 0 && (
                <BlueWordView
                    key={word.id || 'draft'}
                    word={word}
                    onUpdateStage={onUpdateStage}
                    onCreatePhrase={onCreatePhrase}
                />
            )}
            {/* Logic: stage 1-6 is yellow/known/ignored */}
            {!showTranslation && word && currentStage > 0 && (
                <YellowWordView key={word.id} word={word} onUpdateStage={onUpdateStage} />
            )}
        </div>
    );
}