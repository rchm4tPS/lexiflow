import QuickStartGuide from './QuickStartGuide';
import BlueWordView from './BlueWordView';
import YellowWordView from './YellowWordView';
import type { SidebarItem, UpdatePayload } from '../../../types/reader';
import { useReaderStore } from '../../../store/useReaderStore';

interface SidebarProps {
  word: SidebarItem | null;
  onUpdateStage: (payload: UpdatePayload) => void;
  onCreatePhrase: (range: string[], meaning: string) => void;
}

export default function Sidebar({ word, onUpdateStage, onCreatePhrase }: SidebarProps) {
    const { sidebarPosition } = useReaderStore();
    // FIX: Safely coerce the stage to a Number, defaulting to 0.
    // This catches instances where JSON/State causes stage to be undefined or a string
    const currentStage = word ? Number(word.stage || 0) : 0;

    const baseClasses = "w-full lg:w-[350px] xl:w-[400px] shrink-0 h-auto lg:h-full bg-white lg:bg-transparent xl:bg-white flex-col border-t xl:border-t-0 xl:border-l border-gray-200 lg:border-transparent xl:border-gray-200 overflow-hidden z-[60] xl:z-10 transition-all";
    const positionClasses = "lg:absolute lg:top-0 lg:bottom-0 xl:relative";
    const sideClasses = sidebarPosition === 'left' ? 'lg:left-0' : 'lg:right-0';
    const visibilityClasses = !word ? "flex lg:hidden xl:flex" : "flex";

    return (
        <div className={`${baseClasses} ${positionClasses} ${sideClasses} ${visibilityClasses}`} 
             onClick={(e) => {
                 // On medium screens, clicking the transparent wrapper should bubble up and dismiss the overlay.
                 if (window.innerWidth >= 1024 && window.innerWidth < 1280 && e.target === e.currentTarget) {
                     return;
                 }
                 e.stopPropagation();
             }}>
            {!word && <QuickStartGuide />}
            {/* Logic: stage 0 is blue */}
            {word && currentStage === 0 && (
                <BlueWordView
                    key={word.id || 'draft'}
                    word={word}
                    onUpdateStage={onUpdateStage}
                    onCreatePhrase={onCreatePhrase}
                />
            )}
            {/* Logic: stage 1-6 is yellow/known/ignored */}
            {word && currentStage > 0 && (
                <YellowWordView key={word.id} word={word} onUpdateStage={onUpdateStage} />
            )}
        </div>
    );
}