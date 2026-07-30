import React from 'react';
import { useReaderStore } from '../../../store/useReaderStore';

// Draft Phrase Group for drag-selected phrases (blue styling)
interface DraftPhraseGroupProps {
  isDrafted?: boolean;
  isDimmed?: boolean;
  children: React.ReactNode;
}

const DraftPhraseGroup = ({ isDrafted, isDimmed: isDimmedProp, children }: DraftPhraseGroupProps) => {
  const fontSize = useReaderStore(state => state.fontSize);
  const lineHeight = useReaderStore(state => state.lineHeight);
  const isAudioPlaying = useReaderStore(state => state.isAudioPlaying);
  const activeSentenceIndex = useReaderStore(state => state.activeSentenceIndex);
  const readerMode = useReaderStore(state => state.readerMode);
  const tokenMap = useReaderStore(state => state.tokenMap);
  const draftPhraseRange = useReaderStore(state => state.draftPhraseRange);

  // Audio dimming: dim if none of the draft phrase's tokens are in the active sentence (disabled in Sentence View)
  const isDimmed = isDimmedProp ?? (readerMode !== 'sentence' && isAudioPlaying && activeSentenceIndex !== null && draftPhraseRange?.length
    ? draftPhraseRange.every(id => {
        const sentenceIdx = tokenMap[id]?.sentencePageIndex;
        return sentenceIdx !== undefined && sentenceIdx !== activeSentenceIndex;
      })
    : false);

  // Use font-size × line-height scaled padding so it grows when line-height increases
  const vPadding = Math.max(4, Math.round(fontSize * lineHeight * 0.35));

  const bgStyle: React.CSSProperties = isDrafted ? {
    backgroundColor: `rgba(174, 224, 244, 0.6)`,
    WebkitBoxDecorationBreak: 'clone',
    boxDecorationBreak: 'clone',
    paddingTop: `${vPadding}px`,
    paddingBottom: `${vPadding}px`,
  } : {};

  const highlightClass = "relative ring-2 ring-blue-500 shadow-md z-10";
  const dimClass = isDimmed ? 'opacity-30' : '';

  return (
    <span
      style={bgStyle}
      className={`inline rounded-md px-0.75 -mx-0.75 cursor-pointer transition-all duration-200 ${highlightClass} ${dimClass}`}
    >
      {children}
    </span>
  );
};

export default DraftPhraseGroup;
