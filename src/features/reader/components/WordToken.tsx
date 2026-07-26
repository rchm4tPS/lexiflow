import React from 'react';
import { useReaderStore } from '../../../store/useReaderStore';

interface PhraseGroupProps {
  phraseId: string;
  onPhraseClick: (phraseId: string, e: React.MouseEvent) => void;
  children: React.ReactNode;
  depth?: number;
}

// --- THE NEW PHRASE WRAPPER ---
export function PhraseGroup({ phraseId, onPhraseClick, children, depth = 0 }: PhraseGroupProps) {
  const phrase = useReaderStore(React.useCallback(state => state.phraseMap[phraseId], [phraseId]));
  const isSelected = useReaderStore(state => state.selectedId === phraseId);
  
  if (!phrase) return <>{children}</>;
  
  const stage = phrase?.stage || 1;

  // Orange gradient logic
  const opacities = [1, 0.8, 0.6, 0.4, 0.2];
  const opacity = (stage >= 1 && stage <= 5) ? opacities[stage - 1] : 0;
  const vPadding = Math.max(0, 8 - depth * 4);
  const bgStyle: React.CSSProperties = stage <= 5 ? {
    backgroundColor: `rgba(255, 165, 0, ${opacity})`,
    WebkitBoxDecorationBreak: 'clone',
    boxDecorationBreak: 'clone',
    paddingTop: `${vPadding}px`,
    paddingBottom: `${vPadding}px`,
  } : {
    paddingTop: `${vPadding}px`,
    paddingBottom: `${vPadding}px`,
  };

  // Known phrase outline
  const outlineClass = stage === 6 ? "border-2 border-gray-300" : "";

  // Seamless selection ring
  const highlightClass = isSelected ? "relative ring-2 ring-blue-500 shadow-md z-10" : "";

  return (
    <span
      onClick={(e) => onPhraseClick(phraseId, e)}
      style={bgStyle}
      className={`inline rounded-md px-1 -mx-1 cursor-pointer transition-all duration-200 ${outlineClass} ${highlightClass}`}
    >
      {/* Render whatever the recursive tree hands down */}
      {children}
    </span>
  );
}

interface WordTokenProps {
  tokenId: string;
  onClick: (tokenId: string, e: React.MouseEvent) => void;
  isRTL: boolean;
}

const WordToken = React.memo(function WordToken({ tokenId, onClick, isRTL }: WordTokenProps) {
  const token = useReaderStore(React.useCallback(state => state.tokenMap[tokenId], [tokenId]));
  const isSelected = useReaderStore(state => state.selectedId === tokenId || !!state.draftPhraseRange?.includes(tokenId));
  const isDimmed = useReaderStore(React.useCallback(state => {
    if (!state.isAudioPlaying || state.activeSentenceIndex === null) return false;
    const sentenceIdx = state.tokenMap[tokenId]?.sentencePageIndex;
    return sentenceIdx === undefined || sentenceIdx !== state.activeSentenceIndex;
  }, [tokenId]));

  if (!token) return null;

  if (token.isNewline) return <br />;

  const dimClass = isDimmed ? "opacity-30" : "";

  if (token.isLearnable === false) {
    return (
      <span className={`px-0.5 ${isRTL ? 'my-4' : 'my-3'} inline-block text-gray-800 transition-opacity duration-150 ${dimClass}`}>
        {token.text}
      </span>
    );
  }

  // 1. WORD LEVEL LOGIC (Blue / Yellow / Transparent)
  const wordStage = token.stage ?? 0;
  let wordBgStyle: React.CSSProperties = {};

  if (wordStage === 0) {
    wordBgStyle = { backgroundColor: '#AEE0F4' }; // Blue for New
  } else if (wordStage >= 1 && wordStage <= 4) {
    // Opacity: 1: 100%, 2: 75%, 3: 50%, 4: 25%
    const opacities = [1, 0.75, 0.5, 0.25];
    wordBgStyle = { backgroundColor: `rgba(252, 228, 115, ${opacities[wordStage - 1]})` };
  } else {
    wordBgStyle = { backgroundColor: 'transparent' }; // Known or Ignored
  }

  const highlightClass = isSelected ? "ring-2 ring-gray-400/50 outline-none rounded-sm shadow-sm" : "";

  return (
    <span
      data-token-id={token.id} // Essential for Drag-to-Select
      onClick={(e) => onClick(token.id, e)}
      style={wordBgStyle}
      className={`cursor-pointer px-0.75 rounded mx-0.75 ${isRTL ? 'my-4' : 'my-3'} transition-all duration-150 inline-block ${highlightClass} ${dimClass} hover:ring-1 ring-amber-400`}
    >
      {token.text}
    </span>
  );
});

export default WordToken;