import React from 'react';

// Draft Phrase Group for drag-selected phrases (blue styling)
interface DraftPhraseGroupProps {
  isDrafted?: boolean;
  children: React.ReactNode;
}

const DraftPhraseGroup = ({ isDrafted, children }: DraftPhraseGroupProps) => {
  const bgStyle: React.CSSProperties = isDrafted ? {
    backgroundColor: `rgba(174, 224, 244, 0.6)`,
    WebkitBoxDecorationBreak: 'clone',
    boxDecorationBreak: 'clone',
  } : {};

  const highlightClass = "relative ring-2 ring-blue-500 shadow-md z-10";

  return (
    <span
      style={bgStyle}
      className={`inline rounded-md py-1 px-0.75 -mx-0.75 cursor-pointer transition-all duration-200 ${highlightClass}`}
    >
      {children}
    </span>
  );
};

export default DraftPhraseGroup;
