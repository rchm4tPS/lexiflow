import React, { type ReactNode } from 'react';
import { useRef } from 'react';
import { useReaderStore } from '../../../store/useReaderStore';
import type { Token, Phrase } from '../../../types/reader';
import SummaryView from './LessonEnd/SummaryView';
import CompletionModal from './LessonEnd/CompletionModal';
import WordToken, { PhraseGroup } from './WordToken';
import DraftPhraseGroup from './DraftPhraseGroup';
import { RightArrow, LeftArrow } from '../../../components/common/Icons';

// --- SKELETON UI ---
const ReaderSkeleton = () => {
  const rowWidths = [
    ['w-3/4', 'w-1/4', 'w-1/6'],
    ['w-1/2', 'w-1/3', 'w-1/4'],
    ['w-2/3', 'w-1/4', 'w-1/5'],
    ['w-3/4', 'w-1/5', 'w-1/4'],
    ['w-1/2', 'w-1/4', 'w-1/3'],
    ['w-2/3', 'w-1/3', 'w-1/5'],
    ['w-3/4', 'w-1/4', 'w-1/6'],
  ];

  return (
    <div className="flex flex-col gap-5 animate-fade-in w-full px-2">
      {rowWidths.map((row, i) => (
        <div key={i} className="flex flex-wrap gap-2">
          {row.map((width, j) => (
            <div key={j} className={`h-7 rounded-sm bg-gray-100 animate-shimmer ${width}`} />
          ))}
        </div>
      ))}
    </div>
  );
};

interface ReaderPaneProps {
  courseTitle: string;
  lessonTitle: string;
  lessonImg?: string;
}

// interface ReaderModeToggleProps {
//   readerMode: 'paragraph' | 'sentence';
//   toggleReaderMode: () => void;
// }

// const ReaderModeToggle = ({ readerMode, toggleReaderMode }: ReaderModeToggleProps) => (
//   <div 
//       onClick={toggleReaderMode}
//       className="flex h-7 mx-4 mt-2 border border-gray-500 rounded-lg overflow-hidden cursor-pointer hover:border-[#4F8EF8] focus:outline-none transition-colors"
//   >
//     <div className={`flex px-1 items-center transition-colors ${readerMode === 'sentence' ? 'bg-[#424343]' : 'bg-white'}`}>
//       <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
//           <path d="M4 12L20 12" stroke={readerMode === 'sentence' ? "white" : "#424343"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//       </svg>
//     </div>
//     <div className={`flex px-1 items-center transition-colors ${readerMode === 'paragraph' ? 'bg-[#424343]' : 'bg-white'}`}>
//       <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
//           <path d="M4.5,7 L19.5,7 M4.5,11 L19.5,11 M4.5,15 L19.5,15 M4.5,19 L13.5,19" stroke={readerMode === 'paragraph' ? "white" : "#424343"} strokeWidth="2" strokeLinecap="round" />
//       </svg>
//     </div>
//   </div>
// );

export default function ReaderPane({ courseTitle, lessonTitle, lessonImg }: ReaderPaneProps) {
  const {
    showSummary, setShowSummary, showModal, setModal,
    tokens, phrases, currentPage, selectedId, draftPhraseRange,
    selectItem, setDraftPhrase, isRTL,
    handlePageAdvance, activeLessonId, syncLessonProgress,
    isLoadingLesson, readerMode, toggleReaderMode, totalPages, columnMapping, setSidebarPosition, setClickPos
  } = useReaderStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- NEW: CSS Columns Dynamic Layout State ---
  const anchorTokenRef = useRef<string | null>(null);
  const [columnWidthPx, setColumnWidthPx] = React.useState(0);

  // Update anchor token and mark as read when page changes
  React.useLayoutEffect(() => {
    if (columnMapping[currentPage] && columnMapping[currentPage].length > 0) {
      anchorTokenRef.current = columnMapping[currentPage][0];
      useReaderStore.getState().markTokensAsRead(columnMapping[currentPage]);
    }
  }, [currentPage, columnMapping]);

  // Measurement Engine
  React.useLayoutEffect(() => {
    if (!scrollContainerRef.current || isLoadingLesson || tokens.length === 0) return;

    const container = scrollContainerRef.current;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();

      // Fix: Update column width to exact pixels. CSS column-width does not support percentages (e.g. 100%).
      if (columnWidthPx !== containerRect.width && containerRect.width > 0) {
        setColumnWidthPx(containerRect.width);
        return; // Wait for re-render so CSS columns actually flow horizontally
      }

      if (containerRect.width === 0) return;

      const columnWidthAndGap = containerRect.width + 48; // 3rem gap = 48px

      const newTotalPages = Math.ceil(container.scrollWidth / columnWidthAndGap);

      const mapping: Record<number, string[]> = {};
      const tokenNodes = container.querySelectorAll('[data-token-id]');

      tokenNodes.forEach(node => {
        const id = node.getAttribute('data-token-id');
        if (!id) return;
        const rect = node.getBoundingClientRect();
        const relativeLeft = rect.left - containerRect.left;
        let colIndex = Math.floor((relativeLeft + 5) / columnWidthAndGap);
        if (isRTL) {
          const relativeRight = containerRect.right - rect.right;
          colIndex = Math.floor((relativeRight + 5) / columnWidthAndGap);
        }

        if (!mapping[colIndex]) mapping[colIndex] = [];
        mapping[colIndex].push(id);
      });

      let newColForAnchor = -1;
      const { initialTokenIndex, tokens, setInitialTokenIndex } = useReaderStore.getState();

      if (initialTokenIndex !== null && initialTokenIndex >= 0 && initialTokenIndex < tokens.length) {
        const targetTokenId = tokens[initialTokenIndex].id;
        for (const [col, ids] of Object.entries(mapping)) {
          if (ids.includes(targetTokenId)) {
            newColForAnchor = parseInt(col);
            break;
          }
        }
        // Clear it so it only runs once per lesson load
        setInitialTokenIndex(null);
      } else if (anchorTokenRef.current) {
        for (const [col, ids] of Object.entries(mapping)) {
          if (ids.includes(anchorTokenRef.current)) {
            newColForAnchor = parseInt(col);
            break;
          }
        }
      }

      // Update global store!
      useReaderStore.getState().setPagination(newTotalPages || 1, mapping);

      if (newColForAnchor !== -1 && newColForAnchor !== useReaderStore.getState().currentPage) {
        useReaderStore.getState().setPage(newColForAnchor);
      }
    };

    measure();

    // FIX: Re-measure after custom fonts (e.g. Farsi) finish loading to prevent layout shifts
    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (scrollContainerRef.current) measure();
      });
    }

    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [isLoadingLesson, tokens, isRTL, readerMode, columnWidthPx]);

  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    const handleSelectionChange = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) return;

        const node1 = selection.anchorNode?.parentElement?.closest('[data-token-id]');
        const node2 = selection.focusNode?.parentElement?.closest('[data-token-id]');

        if (node1 && node2) {
          const id1 = node1.getAttribute('data-token-id');
          const id2 = node2.getAttribute('data-token-id');

          const idx1 = tokens.findIndex(t => t.id === id1);
          const idx2 = tokens.findIndex(t => t.id === id2);

          if (idx1 !== -1 && idx2 !== -1) {
            const start = Math.min(idx1, idx2);
            const end = Math.max(idx1, idx2);
            const rangeCount = end - start + 1;

            if (rangeCount >= 2 && rangeCount <= 9) {
              const selectedTokenIds = tokens.slice(start, end + 1).map(t => t.id);
              const isValid = !tokens.slice(start, end + 1).some(t => t.isNewline);
              
              if (isValid) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const screenWidth = window.innerWidth;
                
                useReaderStore.getState().setSidebarPosition(rect.left > screenWidth / 2 ? 'left' : 'right');
                useReaderStore.getState().setClickPos({ x: rect.right, y: rect.bottom });
                useReaderStore.getState().setDraftPhrase(selectedTokenIds);
                
                setTimeout(() => selection.removeAllRanges(), 150);
              }
            }
          }
        }
      }, 1600);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [tokens]);

  const mousePos = useRef({
    x: 0,
    y: 0,
    isDragging: false
  })

  const handleMouseDown = (e: React.MouseEvent) => {
    mousePos.current = {
      x: e.clientX,
      y: e.clientY,
      isDragging: false
    }
  }

  // --- DRAG TO SELECT LOGIC ---
  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation()

    // If the mouse moved more than 5 pixels, it's a drag
    if (
      Math.abs(e.clientX - mousePos.current.x) > 5 ||
      Math.abs(e.clientY - mousePos.current.y) > 5
    ) {
      mousePos.current.isDragging = true;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) return;

      // Find the closest data-token-id from the start and end of the selection
      const node1 = selection.anchorNode?.parentElement?.closest('[data-token-id]');
      const node2 = selection.focusNode?.parentElement?.closest('[data-token-id]');

      if (node1 && node2) {
        const id1 = node1.getAttribute('data-token-id');
        const id2 = node2.getAttribute('data-token-id');

        const idx1 = tokens.findIndex(t => t.id === id1);
        const idx2 = tokens.findIndex(t => t.id === id2);

        if (idx1 !== -1 && idx2 !== -1) {
          const start = Math.min(idx1, idx2);
          const end = Math.max(idx1, idx2);
          const rangeCount = end - start + 1;

          // Limit phrase selection to 2-9 words
          if (rangeCount >= 2 && rangeCount <= 9) {
            const selectedTokenIds = tokens.slice(start, end + 1).map(t => t.id);

            // Verify they don't cross page boundaries or newlines
            const isValid = !tokens.slice(start, end + 1).some(t => t.isNewline);
            if (isValid) {
              const screenWidth = window.innerWidth;
              setSidebarPosition(e.clientX > screenWidth / 2 ? 'left' : 'right');
              setClickPos({ x: e.clientX, y: e.clientY });

              setDraftPhrase(selectedTokenIds);
              // Delay clearing the browser highlight so onClick can detect the text selection and abort
              setTimeout(() => selection.removeAllRanges(), 150);
            }
          }
        }
      }
    } else {
      mousePos.current.isDragging = false;
    }

  };

  // --- RECURSIVE DOM ALGORITHM ---
  // This allows infinite levels of stacked phrases (e.g. Phrase inside a Phrase)
  const renderTree = (tokensList: Token[], availablePhrases: Phrase[], isTopLevel: boolean = false, phraseContext?: string): ReactNode => {
    if (tokensList.length === 0) return null;

    // Only check for draft phrase at the top level (page-wide tokens)
    // This prevents infinite recursion from re-wrapping the same tokens
    let hasDraftPhrase = false;
    let draftStartIndex = -1;
    let draftEndIndex = -1;

    if (isTopLevel && draftPhraseRange && draftPhraseRange.length > 0) {
      const allDraftTokensPresent = draftPhraseRange.every((id: string) =>
        tokensList.some(t => t.id === id)
      );

      if (allDraftTokensPresent) {
        hasDraftPhrase = true;
        draftStartIndex = tokensList.findIndex(t => draftPhraseRange.includes(t.id));
        draftEndIndex = tokensList.length - 1 - tokensList.slice().reverse().findIndex(t => draftPhraseRange.includes(t.id));
      }
    }

    // If draft phrase exists at top level, render it as a group (similar to saved phrases)
    if (hasDraftPhrase && draftStartIndex !== -1 && draftEndIndex !== -1) {
      const before = tokensList.slice(0, draftStartIndex);
      const inside = tokensList.slice(draftStartIndex, draftEndIndex + 1);
      const after = tokensList.slice(draftEndIndex + 1);

      return (
        <>
          {renderTree(before, availablePhrases, false, phraseContext)}
          <DraftPhraseGroup key="draft-phrase" isDrafted={true}>
            {renderTree(inside, availablePhrases, false, phraseContext)}
          </DraftPhraseGroup>
          {renderTree(after, availablePhrases, false, phraseContext)}
        </>
      );
    }

    // Find the longest saved phrase that fits entirely within the current tokens
    const validPhrases = availablePhrases.filter(p =>
      p.range.length > 0 && p.range.every((id: string) => tokensList.some(t => t.id === id))
    );

    if (validPhrases.length === 0) {
      // Base case: No phrases cover these tokens. Render standalone words.
      return tokensList.map((token, index) => {
        // Sentence View: force a column break if the next token starts a new sentence
        const nextToken = tokensList[index + 1];
        const shouldBreak = readerMode === 'sentence' && nextToken && token.sentencePageIndex !== nextToken.sentencePageIndex;

        return (
          <React.Fragment key={token.id}>
            {!(readerMode === 'sentence' && token.isNewline) && (
              <WordToken
                token={token}
                isSelected={selectedId === token.id || !!draftPhraseRange?.includes(token.id)}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  const screenWidth = window.innerWidth;
                  setSidebarPosition(e.clientX > screenWidth / 2 ? 'left' : 'right');
                  setClickPos({ x: e.clientX, y: e.clientY });
                  selectItem(token.id);
                }}
              />
            )}
            {shouldBreak && <div style={{ breakAfter: 'column', height: 0, width: '100%' }} />}
          </React.Fragment>
        )
      });
    }

    // Process the outermost phrase first
    validPhrases.sort((a, b) => b.range.length - a.range.length);
    const outermostPhrase = validPhrases[0];

    const startIndex = tokensList.findIndex(t => t.id === outermostPhrase.range[0]);
    const endIndex = tokensList.findIndex(t => t.id === outermostPhrase.range[outermostPhrase.range.length - 1]);

    const before = tokensList.slice(0, startIndex);
    const inside = tokensList.slice(startIndex, endIndex + 1);
    const after = tokensList.slice(endIndex + 1);

    const remainingPhrases = availablePhrases.filter(p => p.id !== outermostPhrase.id);

    return (
      <>
        {renderTree(before, remainingPhrases, false, phraseContext)}
        <PhraseGroup
          key={outermostPhrase.id}
          phrase={outermostPhrase}
          isSelected={selectedId === outermostPhrase.id}
          onPhraseClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            if ((window.getSelection()?.toString().trim().length ?? 0) > 0) return;
            const screenWidth = window.innerWidth;
            setSidebarPosition(e.clientX > screenWidth / 2 ? 'left' : 'right');
            setClickPos({ x: e.clientX, y: e.clientY });
            selectItem(outermostPhrase.id);
          }}
        >
          {/* Recursively render whatever is inside this phrase, passing phrase context */}
          {renderTree(inside, remainingPhrases, false, outermostPhrase.id)}
        </PhraseGroup>
        {renderTree(after, remainingPhrases, false, phraseContext)}
      </>
    );
  };


  // If complete, show the full-width Summary View
  if (showSummary) {
    return (
      <div className="w-full bg-white h-full">
        <SummaryView />
      </div>
    );
  }

  const stillHasBlueWords = tokens.some(w => w.isLearnable && (w.stage ?? 0) === 0)

  const isPageComplete = (pageIndex: number) => {
    const idsOnPage = columnMapping[pageIndex] || [];
    if (idsOnPage.length === 0) return false;

    return idsOnPage.every(id => {
      const token = tokens.find(t => t.id === id);
      if (!token) return true;
      if (!token.isLearnable) return true;
      return (token.stage ?? 0) !== 0;
    });
  }

  return (
    <div
      className={`flex-1 min-w-0 min-h-0 h-full flex flex-col`} dir={isRTL ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (mousePos.current.isDragging) {
          e.stopPropagation();
        }
      }}
    >
      {/* // The checklist turns green when there are NO learnable tokens with stage 0 */}
      {
        showModal && stillHasBlueWords && <CompletionModal />
      }
      {/* Conditional Header Rendering */}
      {currentPage <= 0 ? (
        <div className="flex h-fit mt-1.5 pt-2 px-4">
          <div className={`hidden md:flex xl:hidden ${isRTL ? 'font-farsi' : 'font-nunito'} pt-2 max-w-60 h-fit leading-6`}>
            <p className="text-[#4F8EF8] text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2">{courseTitle}</p>
          </div>
          <div className="hidden md:block xl:hidden pt-2 mx-2 h-2">
            {isRTL ? <LeftArrow dim={6} /> : <RightArrow dim={6} />}
          </div>
          <div className={`hidden md:flex xl:hidden ${isRTL ? 'font-farsi' : 'font-nunito'} pt-2 max-w-75 h-fit leading-6`}>
            <p className="text-[#454646] text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2">{lessonTitle}</p>
          </div>
          <div className={`flex w-full md:w-fit h-fit justify-between md:justify-end gap-2 lg:gap-6 items-center ${isRTL ? 'md:mr-auto' : 'md:ml-auto'}`}>
            {/* Mobile Review Button */}
            <button className="flex lg:hidden bg-[#FFE578] text-[#C0A332] px-2 py-1.5 rounded-md font-semibold text-xs leading-none shadow-sm items-center cursor-pointer shrink-0">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
              <span className="opacity-70 text-black">({tokens.filter(w => w.isLearnable && (w.stage ?? 0) === 0).length})</span>
            </button>
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-center justify-center p-1.5 -m-1.5 rounded-lg cursor-pointer hover:bg-gray-200 active:bg-gray-300 active:scale-95 transition-all duration-200" onClick={toggleReaderMode} title="Toggle Reader Mode">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="w-8 bi bi-text-paragraph opacity-70"><path fillRule="evenodd" d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"></path></svg>
                <p className="text-[10px] w-6 text-center leading-tight mt-0.5">{readerMode === 'sentence' ? 'Sentence View' : 'Normal View'}</p>
              </div>
              <div className={`mb-auto -mt-1.5 ${isRTL ? '' : '-ml-2'} border-2 border-black rounded-full min-h-4 h-fit w-fit text-center text-xs items-center px-1`}>{currentPage + 1}</div>
              <svg className={`h-4 ${isRTL ? '-mr-1' : '-ml-1'} items-center`} fill="#000000" viewBox="-2.16 -2.16 28.32 28.32" transform="rotate(180)"><path d="M21,21H3L12,3Z"></path></svg>
            </div>
            <div className="flex lg:hidden items-center">
              <svg className="w-8 h-8 text-gray-600 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <div className="hidden lg:flex items-center">
              <svg width="30px" viewBox="-1.12 -1.12 18.24 18.24" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="bi bi-three-dots" stroke="#000000" strokeWidth="0.44800000000000006"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path> </g></svg>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-fit mt-1.5 pt-2 px-4">
          <div className={`hidden md:flex ${isRTL ? 'font-farsi' : 'font-nunito'} pt-2 max-w-60 h-fit leading-6`}>
            <p className="text-[#4F8EF8] text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2">{courseTitle}</p>
          </div>
          <div className="hidden md:block pt-2 mx-2 h-2">
            {isRTL ? <LeftArrow dim={6} /> : <RightArrow dim={6} />}
          </div>
          <div className={`hidden md:flex ${isRTL ? 'font-farsi' : 'font-nunito'} pt-2 max-w-75 h-fit leading-6`}>
            <p className="text-[#454646] text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2">{lessonTitle}</p>
          </div>
          <div className={`flex w-full md:w-fit h-fit justify-between md:justify-end gap-2 lg:gap-6 items-center ${isRTL ? 'md:mr-auto' : 'md:ml-auto'}`}>
            {/* Mobile Review Button */}
            <button className="flex lg:hidden bg-[#FFE578] text-[#C0A332] px-2 py-1.5 rounded-md font-semibold text-xs leading-none shadow-sm items-center cursor-pointer shrink-0">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
              <span className="opacity-70 text-black">({tokens.filter(w => w.isLearnable && (w.stage ?? 0) === 0).length})</span>
            </button>
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-center justify-center p-1.5 -m-1.5 rounded-lg cursor-pointer hover:bg-gray-200 active:bg-gray-300 active:scale-95 transition-all duration-200" onClick={toggleReaderMode} title="Toggle Reader Mode">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="w-8 bi bi-text-paragraph opacity-70"><path fillRule="evenodd" d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"></path></svg>
                <p className="text-[10px] w-6 text-center leading-tight mt-0.5">{readerMode === 'sentence' ? 'Sentence View' : 'Normal View'}</p>
              </div>
              <div className={`mb-auto -mt-1.5 ${isRTL ? '' : ''} border-2 border-black rounded-full min-h-4 h-fit w-fit text-center text-xs items-center px-1`}>{currentPage + 1}</div>
              <svg className={`h-4 ${isRTL ? '-mr-1' : '-ml-1'} items-center`} fill="#000000" viewBox="-2.16 -2.16 28.32 28.32" transform="rotate(180)"><path d="M21,21H3L12,3Z"></path></svg>
            </div>
            <div className="flex lg:hidden items-center">
              <svg className="w-8 h-8 text-gray-600 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <div className="hidden lg:flex items-center">
              <svg width="30px" viewBox="-1.12 -1.12 18.24 18.24" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="bi bi-three-dots" stroke="#000000" strokeWidth="0.44800000000000006"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path> </g></svg>
            </div>
          </div>
        </div>
      )}

      <div className={`flex max-h-[90%] grow`}>
        <div className="w-8 sm:w-16 lg:w-28 flex flex-col items-center justify-center cursor-pointer opacity-60 hover:opacity-100 shrink-0">
          {currentPage > 0 && (
            <button onClick={() => handlePageAdvance(currentPage - 1)} className="bg-gray-200 rounded-full p-2 lg:p-4 shadow-md border border-gray-200 text-gray-500 cursor-pointer hover:text-blue-600 hover:bg-blue-100 hover:scale-105 transition-all">
              {isRTL ? <RightArrow className="w-5 h-5 sm:w-8 sm:h-8 lg:w-12 lg:h-12" /> : <LeftArrow className="w-5 h-5 sm:w-8 sm:h-8 lg:w-12 lg:h-12" />}
            </button>
          )}
        </div>

        <div className={`flex flex-col mt-2 lg:mt-4 grow min-w-0 ${isRTL ? 'font-farsi-trad pl-4 lg:pl-8 pr-2 lg:pr-4' : 'font-nunito px-2 lg:px-4'} relative bg-white rounded-md`}>
          {/* MOBILE/TABLET STEP UI PROGRESS */}
          <div className="hidden md:flex lg:hidden w-full overflow-x-auto px-4 py-2 shrink-0 scrollbar-hide" dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex items-center w-full min-w-max mx-auto justify-center">
              {Array.from({ length: totalPages }).map((_, i) => {
                const isComplete = isPageComplete(i);
                const isNextComplete = i < totalPages - 1 ? isPageComplete(i + 1) : false;
                return (
                  <React.Fragment key={i}>
                    <button
                      onClick={() => handlePageAdvance(i)}
                      className={`relative w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shrink-0 rounded-full transition-all duration-300 cursor-pointer shadow-sm z-10
                                      ${currentPage === i ? 'ring-2 ring-blue-500 scale-125 border-2 border-white' : 'border-2 border-white'}
                                      ${isComplete ? 'bg-green-400' : 'bg-gray-300'}
                                  `}
                    >
                      {isComplete && <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    {i < totalPages - 1 && (
                      <div className={`w-6 sm:w-10 h-1 transition-all duration-300 ${isComplete && isNextComplete ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className={`w-full h-full overflow-hidden relative ${isRTL ? 'pt-1 pb-6' : 'pb-4 lg:pb-6'}`}>
            <div
              ref={scrollContainerRef}
              className={`w-full h-full ${isRTL ? 'text-[clamp(1.2rem,4vw,1.75rem)]' : 'text-[clamp(1.1rem,3.5vw,1.5rem)]'} leading-7 lg:leading-8 text-gray-800 font-medium transition-transform duration-300`}
              style={{
                columnWidth: columnWidthPx > 0 ? `${columnWidthPx}px` : 'auto',
                columnGap: '3rem',
                columnFill: 'auto',
                transform: `translateX(calc(${isRTL ? '' : '-'}${currentPage} * (100% + 3rem)))`,
              }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            >
              {isLoadingLesson ? (
                <ReaderSkeleton />
              ) : (
                <>
                  <div className={`hidden xl:flex mb-2 lg:mb-4 mt-1 lg:mt-2 ${isRTL ? 'border-b' : ''}`} style={{ breakInside: 'avoid' }}>
                    <div className={`rounded-lg ${lessonImg ? '' : ' bg-gradient-to-tr from-green-200 to-blue-300'} w-24 h-24 lg:w-32.5 lg:h-35 content-center text-center shrink-0`}>
                      {
                        !lessonImg
                          ? <div className="w-full h-full flex items-center justify-center text-blue-400 text-4xl lg:text-6xl">📖</div>
                          : <img className="object-cover rounded-lg w-full h-full" src={lessonImg} />
                      }
                    </div>
                    <div className={`flex-col p-2 lg:p-3 max-w-[80%] ${isRTL ? 'border-gray-400 xl:h-38' : ''}`}>
                      <p className="text-[#4F8EF8] text-[14px] lg:text-[18px] font-extrabold">{courseTitle}</p>
                      <p className={`text-[#454646] text-[20px] lg:text-[30px] font-extrabold line-clamp-2 ${isRTL ? 'leading-normal' : 'leading-tight'} lg:leading-13`}>{lessonTitle}</p>
                    </div>
                  </div>
                  {/* Start the recursive build! Pass isTopLevel=true for first call */}
                  {renderTree(tokens, phrases, true)}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Area (Next Button) */}
        <div className="w-8 sm:w-16 lg:w-28 flex flex-col items-center justify-center cursor-pointer opacity-60 hover:opacity-100 shrink-0">
          {currentPage < totalPages - 1 && (
            <button onClick={() => handlePageAdvance(currentPage + 1)} className="bg-gray-200 rounded-full p-2 lg:p-4 shadow-md border border-gray-200 text-gray-500 cursor-pointer hover:text-blue-600 hover:bg-blue-100 hover:scale-105 transition-all">
              {isRTL ? <LeftArrow className="w-5 h-5 sm:w-8 sm:h-8 lg:w-12 lg:h-12" /> : <RightArrow className="w-5 h-5 sm:w-8 sm:h-8 lg:w-12 lg:h-12" />}
            </button>
          )}
          {currentPage === totalPages - 1 && (
            <button
              onClick={() => {
                if (stillHasBlueWords) {
                  setModal(true);
                } else {
                  setShowSummary(true);
                  // Signal the backend to bump read_times and flush remaining words
                  if (activeLessonId) syncLessonProgress(activeLessonId, true, true);
                }
              }}
              className="flex flex-col text-center cursor-pointer focus:outline-none"
            >
              <svg className="mx-auto w-6 h-6 sm:w-10 sm:h-10 lg:w-[60px] lg:h-[60px]" viewBox="-1.6 -1.6 19.20 19.20" fill="rgb(93,233,106)" xmlns="http://www.w3.org/2000/svg" stroke="#5DE96A" strokeWidth="0.00016"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path clipRule="evenodd" d="M15.4142 4.41421L6 13.8284L0.585785 8.41421L3.41421 5.58578L6 8.17157L12.5858 1.58578L15.4142 4.41421Z" fill="#5DE96A" fillRule="evenodd"></path></g></svg>
              <span className="font-semibold text-[8px] sm:text-[10px] lg:text-sm leading-tight mt-1">Complete<br />Lesson</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}