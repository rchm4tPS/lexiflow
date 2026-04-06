/* eslint-disable @typescript-eslint/no-explicit-any */
import QuickStartGuide from './QuickStartGuide';
import BlueWordView from './BlueWordView';
import YellowWordView from './YellowWordView';

export default function Sidebar({ word, onUpdateStage, onCreatePhrase }: any) {
    // FIX: Safely coerce the stage to a Number, defaulting to 0.
    // This catches instances where JSON/State causes stage to be undefined or a string
    const currentStage = word ? Number(word.stage || 0) : 0;

    return (
        <div className="w-[35%] bg-[#FFFFFF] flex" onClick={(e) => e.stopPropagation()}>
            {!word && <QuickStartGuide />}
            {/* Logic: stage 0 is blue */}
            {word && currentStage === 0 && (
                <BlueWordView
                    word={word}
                    onUpdateStage={onUpdateStage}
                    onCreatePhrase={onCreatePhrase}
                />
            )}
            {/* Logic: stage 1-6 is yellow/known/ignored */}
            {word && currentStage > 0 && (
                <YellowWordView word={word} onUpdateStage={onUpdateStage} />
            )}
        </div>
    );
}