/* eslint-disable @typescript-eslint/no-explicit-any */
import {useReaderStore} from '../../../store/useReaderStore';

// --- THE NEW PHRASE WRAPPER ---
export function PhraseGroup({ phrase, isSelected, onPhraseClick, children }: any) {
  const stage = phrase?.stage || 1;
  
  // Orange gradient logic
  const opacities =[1, 0.8, 0.6, 0.4, 0.2];
  const opacity = (stage >= 1 && stage <= 5) ? opacities[stage - 1] : 0;
  const bgStyle: React.CSSProperties = stage <= 5 ? {
    backgroundColor: `rgba(255, 165, 0, ${opacity})`,
    WebkitBoxDecorationBreak: 'clone',
    boxDecorationBreak: 'clone',
  } : {};
  
  // Known phrase outline
  const outlineClass = stage === 6 ? "border-2 border-gray-300" : "";
  
  // Seamless selection ring
  const highlightClass = isSelected ? "ring-2 ring-blue-500 shadow-md z-10" : "";

  return (
    <span 
      onClick={onPhraseClick}
      style={bgStyle}
      className={`relative inline rounded-md px-1/2 py-1.5 mx-3/4 cursor-pointer transition-all duration-200 ${outlineClass} ${highlightClass}`}
    >
      {/* Render whatever the recursive tree hands down */}
        {children}
    </span>
  );
}

export default function WordToken({ token, isSelected, onClick }: any) {
  const { isRTL } = useReaderStore();

  if (token.isNewline) return <br />;

  if (token.isLearnable === false) {
    return (
      <span className={`px-0.5 ${isRTL ? 'my-4' : 'my-3'} inline-block text-gray-800`}>
        {token.text}
      </span>
    );
  }

  // 1. WORD LEVEL LOGIC (Blue / Yellow / Transparent)
  const wordStage = token.stage ?? 0;
  let wordBgStyle = {};

  if (wordStage === 0) {
    wordBgStyle = { backgroundColor: '#AEE0F4' }; // Blue for New
  } else if (wordStage >= 1 && wordStage <= 4) {
    // Opacity: 1: 100%, 2: 75%, 3: 50%, 4: 25%
    const opacities = [1, 0.75, 0.5, 0.25];
    wordBgStyle = { backgroundColor: `rgba(252, 228, 115, ${opacities[wordStage-1]})` }; 
  } else {
    wordBgStyle = { backgroundColor: 'transparent' }; // Known or Ignored
  }

  const highlightClass = isSelected ? "ring-2 ring-gray-400/50 outline-none rounded-sm shadow-sm" : "";

  return (
      <span 
        data-token-id={token.id} // Essential for Drag-to-Select
        onClick={onClick}
        style={wordBgStyle}
        className={`cursor-pointer px-1 rounded ${isRTL ? 'ms-0.75 me-0.75 my-4' : 'mx-0.75 my-3'} transition-all duration-50 inline-block ${highlightClass} hover:ring-1 ring-amber-400`}
      >
        {token.text}
      </span>
  );
}