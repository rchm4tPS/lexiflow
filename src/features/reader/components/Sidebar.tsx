import QuickStartGuide from './QuickStartGuide';
import BlueWordView from './BlueWordView';
import YellowWordView from './YellowWordView';
import type { Token, Phrase } from '../../../types/reader';

interface UpdatePayload {
  id: string;
  stage: number;
  meaning?: string;
  tags?: string[];
  notes?: string;
}

interface SidebarProps {
  word: (Token | Phrase) | null;
  onUpdateStage: (payload: UpdatePayload) => void;
  onCreatePhrase: (range: string[], meaning: string) => void;
}

export default function Sidebar({ word, onUpdateStage, onCreatePhrase }: SidebarProps) {
    // FIX: Safely coerce the stage to a Number, defaulting to 0.
    // This catches instances where JSON/State causes stage to be undefined or a string
    const currentStage = word ? Number(word.stage || 0) : 0;

    return (
        <div className="w-[35%] bg-[#FFFFFF] flex" onClick={(e) => e.stopPropagation()}>
            {!word && <QuickStartGuide />}
            {/* Logic: stage 0 is blue */}
            {word && currentStage === 0 && (
                <BlueWordView
                    key={word.id}
                    word={word as Token} // In stage 0 it's always a Token or Draft Phrase
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