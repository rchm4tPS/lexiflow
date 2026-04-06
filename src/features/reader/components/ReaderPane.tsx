/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { type ReactNode } from 'react';
import { useRef } from 'react';
import { useReaderStore } from '../../../store/useReaderStore';
import SummaryView from './LessonEnd/SummaryView';
import CompletionModal from './LessonEnd/CompletionModal';
import WordToken, { PhraseGroup } from './WordToken';
import DraftPhraseGroup from './DraftPhraseGroup';
import { RightArrow, LeftArrow } from '../../../components/common/Icons';

export default function ReaderPane({ courseTitle, lessonTitle, lessonImg }: any) {
  const { 
    showSummary, setShowSummary, showModal, setModal,
    tokens, phrases, currentPage, selectedId, draftPhraseRange,
    selectItem, setPage, setDraftPhrase, isRTL,
    handlePageAdvance, activeLessonId, syncLessonProgress,
    isLoadingLesson
  } = useReaderStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Scroll to top when page changes
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  }, [currentPage]);

  // ONLY SHOW WORDS FOR THIS PAGE
  const pageTokens = tokens.filter(t => t.pageIndex === currentPage);
  const totalPages = Math.max(...tokens.map(t => t.pageIndex)) + 1;

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
  const renderTree = (tokensList: any[], availablePhrases: any[], isTopLevel: boolean = false, phraseContext?: string): ReactNode => {
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
      return tokensList.map(token => {
        return (
         <WordToken
           key={token.id}
           token={token}
           isSelected={selectedId === token.id || draftPhraseRange?.includes(token.id)} // FIX: Only highlight if this exact word is selected
           onClick={(e:any) => {
             e.stopPropagation(); // CRITICAL: Catches click before it hits the Phrase box
             selectItem(token.id); // FIX: Always select the word itself
           }}
         />
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
          onPhraseClick={(e: any) => {
             e.stopPropagation();
             if ((window.getSelection()?.toString().trim().length ?? 0) > 0) return;
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

  return (
    <div 
      className={`w-[65%] flex flex-col`} dir={isRTL ? 'rtl' : 'ltr'}
      onClick={(e) => e.stopPropagation()}
    >
    {/* // The checklist turns green when there are NO learnable tokens with stage 0 */}
    {
         showModal && stillHasBlueWords && <CompletionModal /> 
    }
      {/* Conditional Header Rendering */}
      {currentPage <= 0 ? (
        <div className="flex h-fit gap-5 mt-1.5 pt-2 px-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex h-7 mt-2 border border-gray-500 rounded-lg overflow-hidden">
            <div className="flex px-1">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12L20 12" stroke="#424343" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </svg>
            </div>
            <div className="flex bg-[#424343] px-1">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4.5,7 C4.22385763,7 4,6.77614237 4,6.5 C4,6.22385763 4.22385763,6 4.5,6 L19.5,6 C19.7761424,6 20,6.22385763 20,6.5 C20,6.77614237 19.7761424,7 19.5,7 L4.5,7 Z M4.5,11 C4.22385763,11 4,10.7761424 4,10.5 C4,10.2238576 4.22385763,10 4.5,10 L19.5,10 C19.7761424,10 20,10.2238576 20,10.5 C20,10.7761424 19.7761424,11 19.5,11 L4.5,11 Z M4.5,15 C4.22385763,15 4,14.7761424 4,14.5 C4,14.2238576 4.22385763,14 4.5,14 L19.5,14 C19.7761424,14 20,14.2238576 20,14.5 C20,14.7761424 19.7761424,15 19.5,15 L4.5,15 Z M4.5,19 C4.22385763,19 4,18.7761424 4,18.5 C4,18.2238576 4.22385763,18 4.5,18 L13.5,18 C13.7761424,18 14,18.2238576 14,18.5 C14,18.7761424 13.7761424,19 13.5,19 L4.5,19 Z" stroke="white" strokeWidth="1.064" strokeMiterlimit="10" strokeLinecap="round"></path></svg>
            </div>
          </div>
          <div className={`flex h-fit gap-6 ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
            <div className="flex items-center gap-1">
              <div className="flex flex-col h-fit">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="w-8 bi bi-text-paragraph"><path fillRule="evenodd" d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"></path></svg>
                <p className="text-[10px]">Full Text</p>
              </div>
              <div className={`mb-auto -mt-1.5 ${isRTL ? '-mr-2' : '-ml-2'} border-2 border-black rounded-full min-h-4 h-fit w-fit text-center text-xs items-center px-1`}>2</div>
              <svg className={`h-4 ${isRTL? '-mr-1' : '-ml-1'} items-center`} fill="#000000" viewBox="-2.16 -2.16 28.32 28.32" transform="rotate(180)"><path d="M21,21H3L12,3Z"></path></svg>
            </div>
            <div className="flex items-center">
              <svg width="30px" viewBox="-1.12 -1.12 18.24 18.24" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="bi bi-three-dots" stroke="#000000" strokeWidth="0.44800000000000006"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path> </g></svg>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-fit mt-1.5 pt-2 px-4" onClick={(e) => e.stopPropagation()}>
          <div className={`flex h-7 mt-2 ${isRTL ? 'ml-4' : 'mr-4'} border border-gray-500 rounded-lg overflow-hidden`}>
            <div className="flex px-1">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12L20 12" stroke="#424343" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </svg>
            </div>
            <div className="flex bg-[#424343] px-1">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4.5,7 C4.22385763,7 4,6.77614237 4,6.5 C4,6.22385763 4.22385763,6 4.5,6 L19.5,6 C19.7761424,6 20,6.22385763 20,6.5 C20,6.77614237 19.7761424,7 19.5,7 L4.5,7 Z M4.5,11 C4.22385763,11 4,10.7761424 4,10.5 C4,10.2238576 4.22385763,10 4.5,10 L19.5,10 C19.7761424,10 20,10.2238576 20,10.5 C20,10.7761424 19.7761424,11 19.5,11 L4.5,11 Z M4.5,15 C4.22385763,15 4,14.7761424 4,14.5 C4,14.2238576 4.22385763,14 4.5,14 L19.5,14 C19.7761424,14 20,14.2238576 20,14.5 C20,14.7761424 19.7761424,15 19.5,15 L4.5,15 Z M4.5,19 C4.22385763,19 4,18.7761424 4,18.5 C4,18.2238576 4.22385763,18 4.5,18 L13.5,18 C13.7761424,18 14,18.2238576 14,18.5 C14,18.7761424 13.7761424,19 13.5,19 L4.5,19 Z" stroke="white" strokeWidth="1.064" strokeMiterlimit="10" strokeLinecap="round"></path></svg>
            </div>
          </div>
          <div className={`${isRTL ? 'font-farsi' : 'font-nunito'} flex pt-2 max-w-60 h-fit leading-6`}>
            <p className="text-[#4F8EF8] text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2">{courseTitle}</p>
          </div>
          <div className="pt-2 mx-2 h-2">
            {isRTL ? <LeftArrow dim={6} /> : <RightArrow dim={6} />}
          </div>
          <div className={`${isRTL ? 'font-farsi' : 'font-nunito'} flex pt-2 max-w-75 h-fit leading-6`}>
            <p className="text-[#454646] text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2">{lessonTitle}</p>
          </div>
          <div className={`flex ${isRTL ? 'mr-auto' : 'ml-auto'} h-fit gap-6`}>
            <div className="flex items-center gap-1">
              <div className="flex flex-col h-fit">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="w-8 bi bi-text-paragraph"><path fillRule="evenodd" d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"></path></svg>
                <p className="text-[10px]">Full Text</p>
              </div>
              <div className={`mb-auto -mt-1.5 ${isRTL ? '-mr-2' : '-ml-2'} border-2 border-black rounded-full min-h-4 h-fit w-fit text-center text-xs items-center px-1`}>2</div>
              <svg className={`h-4 ${isRTL? '-mr-1' : '-ml-1'} items-center`} fill="#000000" viewBox="-2.16 -2.16 28.32 28.32" transform="rotate(180)"><path d="M21,21H3L12,3Z"></path></svg>
            </div>
            <div className="flex items-center">
              <svg width="30px" viewBox="-1.12 -1.12 18.24 18.24" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="bi bi-three-dots" stroke="#000000" strokeWidth="0.44800000000000006"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path> </g></svg>
            </div>
          </div>
        </div>
      )}

      <div className={`flex max-h-[90%] grow`}>
        {/* Left Area (Empty space or Prev Button) */}
        <div className="min-w-20 flex items-center justify-center cursor-pointer opacity-60 hover:opacity-100 ">
          {currentPage > 0 && (
            <button onClick={() => setPage(currentPage - 1)} className="text-gray-400 cursor-pointer hover:text-gray-600">
              {isRTL ? <RightArrow/> : <LeftArrow/>}
            </button>
          )}
        </div>

        <div className={`flex flex-col mt-2 grow ${isRTL ? 'font-farsi-trad' : 'font-nunito'}`}>
          {currentPage <= 0 && (
            <div className={`flex mb-4 mt-2 ${isRTL ? 'border-b' : ''}`}>
              <div className={`rounded-lg ${lessonImg ? '': ' bg-gradient-to-tr from-green-200 to-blue-300'}  w-32.5 h-35 content-center text-center`}>
                { 
                  !lessonImg 
                    ? <div className="w-full h-full flex items-center justify-center text-blue-400 text-6xl">📖</div>
                    : <img className="object-fill rounded-lg" src={lessonImg} />
                }
              </div>
              <div className={`flex-col p-3 max-w-[80%] ${isRTL ? 'border-gray-400 h-38' : ''}`}>
                <p className="text-[#4F8EF8] text-[18px] font-extrabold">{courseTitle}</p>
                <p className="text-[#454646] text-[30px] font-extrabold line-clamp-2 leading-13">{lessonTitle}</p>
              </div>
            </div>
          )}

          <div 
            ref={scrollContainerRef}
            className={`grow ${isRTL ? 'text-[26px] py-1' : 'text-[21px]'} leading-8 text-gray-800 px-4 my-4 font-medium overflow-y-auto h-[600px] bg-white rounded-md transition-all duration-300`}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            {isLoadingLesson ? (
              <ReaderSkeleton />
            ) : (
              /* Start the recursive build! Pass isTopLevel=true for first call */
              renderTree(pageTokens, phrases, true)
            )}
          </div>
        </div>

        {/* Right Area (Next Button) */}
        <div className="w-20 flex items-center justify-center cursor-pointer opacity-60 hover:opacity-100 ">
          {currentPage < totalPages - 1 && (
            <button onClick={() => handlePageAdvance(currentPage + 1)} className="text-gray-400 text-6xl hover:text-gray-600 transition cursor-pointer">
              {isRTL ? <LeftArrow /> : <RightArrow/>}
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
              className={`flex flex-col text-center ${isRTL ? 'ml-4' : '-ml-4'} cursor-pointer`}
            >
              <svg className='mx-auto' width="60px" height="60px" viewBox="-1.6 -1.6 19.20 19.20" fill="rgb(93,233,106)" xmlns="http://www.w3.org/2000/svg" stroke="#5DE96A" strokeWidth="0.00016"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path clipRule="evenodd" d="M15.4142 4.41421L6 13.8284L0.585785 8.41421L3.41421 5.58578L6 8.17157L12.5858 1.58578L15.4142 4.41421Z" fill="#5DE96A" fillRule="evenodd"></path></g></svg>
              <span className='font-semibold'>Complete Lesson</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}