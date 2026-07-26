import React, { type ReactNode, useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Info, Download, Languages, Zap, PanelRightClose, PanelRightOpen, Settings, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useReaderStore } from '../../../store/useReaderStore';
import SummaryView from './LessonEnd/SummaryView';
import CompletionModal from './LessonEnd/CompletionModal';
import WordToken, { PhraseGroup } from './WordToken';
import DraftPhraseGroup from './DraftPhraseGroup';
import QuickStartGuide from './QuickStartGuide';
import { RightArrow, LeftArrow } from '../../../components/common/Icons';
import MorphingPageDots from '../../../components/ui/morphing-page-dots';

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
  courseId?: string | null;
  courseTitle: string;
  lessonTitle: string;
  lessonImg?: string | null;
}

const ReaderPane = React.memo(function ReaderPane({ courseId, courseTitle, lessonTitle, lessonImg }: ReaderPaneProps) {
  const {
    showSummary, setShowSummary, showModal, setModal,
    lessonStructureHash, currentPage, draftPhraseRange,
    setDraftPhrase, isRTL, languageCode,
    handlePageAdvance, activeLessonId, syncLessonProgress,
    isLoadingLesson, readerMode, toggleReaderMode, totalPages, columnMapping, setSidebarPosition, setClickPos,
    lessonIndex, courseLessonsCount, prevLessonId, nextLessonId, setShowLessonInfoModal, initialTokenIndex,
    isStatsLoading, lessonAudio, toggleSidebar, isSidebarVisible
  } = useReaderStore(useShallow(state => ({
    showSummary: state.showSummary, setShowSummary: state.setShowSummary, showModal: state.showModal, setModal: state.setModal,
    lessonStructureHash: state.lessonStructureHash, currentPage: state.currentPage, draftPhraseRange: state.draftPhraseRange,
    setDraftPhrase: state.setDraftPhrase, isRTL: state.isRTL, languageCode: state.languageCode,
    handlePageAdvance: state.handlePageAdvance, activeLessonId: state.activeLessonId, syncLessonProgress: state.syncLessonProgress,
    isLoadingLesson: state.isLoadingLesson, readerMode: state.readerMode, toggleReaderMode: state.toggleReaderMode, totalPages: state.totalPages, columnMapping: state.columnMapping, setSidebarPosition: state.setSidebarPosition, setClickPos: state.setClickPos,
    lessonIndex: state.lessonIndex, courseLessonsCount: state.courseLessonsCount, prevLessonId: state.prevLessonId, nextLessonId: state.nextLessonId, setShowLessonInfoModal: state.setShowLessonInfoModal, initialTokenIndex: state.initialTokenIndex,
    isStatsLoading: state.isStatsLoading, lessonAudio: state.lessonAudio, toggleSidebar: state.toggleSidebar, isSidebarVisible: state.isSidebarVisible
  })));

  const tokens = useReaderStore.getState().tokens;
  const phrases = useReaderStore.getState().phrases;
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- STABLE CALLBACKS FOR WORD TOKENS ---
  const handleWordClick = React.useCallback((tokenId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const state = useReaderStore.getState();
    const screenWidth = window.innerWidth;
    state.setSidebarPosition(e.clientX > screenWidth / 2 ? 'left' : 'right');
    state.setClickPos({ x: e.clientX, y: e.clientY });
    state.selectItem(tokenId);
    if (state.readerMode === 'sentence') {
      const globalIndex = state.tokens.findIndex(t => t.id === tokenId);
      if (globalIndex !== -1) {
        state.setInitialTokenIndex(globalIndex);
      }
    }
  }, []);

  const handlePhraseClick = React.useCallback((phraseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ((window.getSelection()?.toString().trim().length ?? 0) > 0) return;
    const state = useReaderStore.getState();
    const screenWidth = window.innerWidth;
    state.setSidebarPosition(e.clientX > screenWidth / 2 ? 'left' : 'right');
    state.setClickPos({ x: e.clientX, y: e.clientY });
    state.selectItem(phraseId);
  }, []);

  // --- NEW: Dropdown State ---
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showQuickStartDrawer, setShowQuickStartDrawer] = useState(false);
  const [isQuickStartClosing, setIsQuickStartClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- NEW: Drawer Drag State ---
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const handleDragStart = (clientY: number) => {
    if (window.innerWidth >= 640) return;
    dragStartY.current = clientY;
  };
  const handleDragMove = (clientY: number) => {
    if (window.innerWidth >= 640 || dragStartY.current === null) return;
    const diff = clientY - dragStartY.current;
    if (diff > 0) setDragY(diff);
  };
  const handleDragEnd = () => {
    if (window.innerWidth >= 640 || dragStartY.current === null) return;
    if (dragY > 80) closeQuickStart();
    dragStartY.current = null;
    setDragY(0);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location.pathname]);

  const handleDownloadAudio = () => {
    if (!lessonAudio) {
      Swal.fire({ 
        icon: 'info', 
        title: 'No Audio', 
        text: 'There is no audio available for this lesson.', 
        confirmButtonColor: '#3890fc' 
      });
      closeDropdown();
      return;
    }
    
    // Direct link fallback, since we can't fetch it due to strict CORS on CDN
    // The downloaded file might carry the CDN's raw filename
    const fallbackLink = document.createElement('a');
    fallbackLink.href = lessonAudio;
    fallbackLink.target = '_blank';
    fallbackLink.download = `${lessonTitle}.mp3`;
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
    closeDropdown();
  };

  const closeQuickStart = () => {
    setIsQuickStartClosing(true);
    setTimeout(() => {
      setShowQuickStartDrawer(false);
      setIsQuickStartClosing(false);
    }, 280); // matches the ~0.3s CSS animation duration
  };

  const handleQuickStart = () => {
    closeDropdown();
    setShowQuickStartDrawer(true);
    setIsQuickStartClosing(false);
  };

  // --- NEW: CSS Columns Dynamic Layout State ---
  const anchorTokenRef = useRef<string | null>(null);
  const [columnWidthPx, setColumnWidthPx] = React.useState(0);

  // Count of unique LingQs (stage 1, 2, 3) in the lesson
  const uniqueLingQs = new Set(
    tokens
      .filter(w => w.isLearnable && (w.stage ?? 0) > 0 && (w.stage ?? 0) < 4)
      .map(w => w.text.toLowerCase())
  );
  const uniquePhrases = new Set(
    phrases
      .filter(p => (p.stage ?? 0) > 0 && (p.stage ?? 0) < 4)
      .map(p => p.text.toLowerCase())
  );
  const reviewCount = uniqueLingQs.size + uniquePhrases.size;

  // Update anchor token and mark as read when page changes
  React.useLayoutEffect(() => {
    if (initialTokenIndex !== null) return;
    if (columnMapping[currentPage] && columnMapping[currentPage].length > 0) {
      anchorTokenRef.current = columnMapping[currentPage][0];
      useReaderStore.getState().markTokensAsRead(columnMapping[currentPage]);
    }
  }, [currentPage, columnMapping, initialTokenIndex]);

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

      // Calculate total pages based on actual tokens, ignoring empty trailing scroll width
      const maxColIndex = Object.keys(mapping).length > 0 
        ? Math.max(...Object.keys(mapping).map(Number)) 
        : 0;
      const newTotalPages = Math.max(1, maxColIndex + 1);

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
          
          const selectedTokens = tokens.slice(start, end + 1);
          const learnableCount = selectedTokens.filter(t => t.isLearnable).length;

          // Limit phrase selection to 2-9 learnable words
          if (learnableCount >= 2 && learnableCount <= 9) {
            const selectedTokenIds = selectedTokens.map(t => t.id);

            // Verify they don't cross page boundaries or newlines
            const isValid = !selectedTokens.some(t => t.isNewline);
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
  const renderTree = (
    tokensList: typeof tokens,
    availablePhrases: typeof phrases,
    isTopLevel: boolean = false,
    phraseContext: string | null = null,
    depth: number = 0
  ): ReactNode => {
    if (tokensList.length === 0) return null;

    // Only check for draft phrase at the top level (page-wide tokens)
    // This prevents infinite recursion from re-wrapping the same tokens
    let hasDraftPhrase = false;
    let draftStartIndex = -1;
    let draftEndIndex = -1;

    const tokenIds = new Set(tokensList.map(t => t.id));

    if (isTopLevel && draftPhraseRange && draftPhraseRange.length > 0) {
      const allDraftTokensPresent = draftPhraseRange.every((id: string) => tokenIds.has(id));

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
          {renderTree(before, availablePhrases, false, phraseContext, depth)}
          <DraftPhraseGroup key="draft-phrase" isDrafted={true}>
            {renderTree(inside, availablePhrases, false, phraseContext, depth + 1)}
          </DraftPhraseGroup>
          {renderTree(after, availablePhrases, false, phraseContext, depth)}
        </>
      );
    }

    // Find the longest saved phrase that fits entirely within the current tokens
    const validPhrases = availablePhrases.filter(p =>
      p.range.length > 0 && p.range.every((id: string) => tokenIds.has(id))
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
                tokenId={token.id}
                isRTL={isRTL}
                onClick={handleWordClick}
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
        {renderTree(before, remainingPhrases, false, phraseContext, depth)}
        <PhraseGroup
          key={outermostPhrase.id}
          phraseId={outermostPhrase.id}
          depth={depth}
          onPhraseClick={handlePhraseClick}
        >
          {/* Recursively render whatever is inside this phrase, passing phrase context */}
          {renderTree(inside, remainingPhrases, false, outermostPhrase.id, depth + 1)}
        </PhraseGroup>
        {renderTree(after, remainingPhrases, false, phraseContext, depth)}
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

  const stillHasBlueWords = useReaderStore(state => state.tokens.some(w => w.isLearnable && (w.stage ?? 0) === 0));

  const renderedTree = React.useMemo(() => {
    if (isLoadingLesson || tokens.length === 0) return null;
    return (
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
            {courseId ? (
              <Link to={`/me/${languageCode}/course/${courseId}`} className="text-[#4F8EF8] hover:underline text-[14px] lg:text-[18px] font-extrabold">{courseTitle}</Link>
            ) : (
              <p className="text-[#4F8EF8] text-[14px] lg:text-[18px] font-extrabold">{courseTitle}</p>
            )}
            <p className={`text-[#454646] text-[20px] lg:text-[30px] font-extrabold line-clamp-2 ${isRTL ? 'leading-normal' : 'leading-tight'} lg:leading-13`}>{lessonTitle}</p>
          </div>
        </div>
        {renderTree(tokens, phrases, true)}
      </>
    );
  }, [lessonStructureHash, courseId, languageCode, courseTitle, lessonImg, lessonTitle, isRTL, handleWordClick, handlePhraseClick, readerMode, draftPhraseRange, isLoadingLesson]);


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
        <div className="flex items-center h-fit mt-1.5 pt-2 px-4">
          <div className={`hidden md:flex xl:hidden ${isRTL ? 'font-farsi' : 'font-nunito'} shrink min-w-0 max-w-60 h-fit leading-6`}>
            {isLoadingLesson || isStatsLoading ? (
              <div className="h-5 w-32 bg-gray-200 animate-shimmer rounded" />
            ) : courseId ? (
              <Link to={`/me/${languageCode}/course/${courseId}`} className="text-[#4F8EF8] hover:underline text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2" title={courseTitle}>{courseTitle}</Link>
            ) : (
              <p className="text-[#4F8EF8] text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2" title={courseTitle}>{courseTitle}</p>
            )}
          </div>
          <div className="hidden md:flex xl:hidden items-center mx-2 h-fit shrink-0">
            {isRTL ? <LeftArrow dim={6} /> : <RightArrow dim={6} />}
          </div>
          <div className={`hidden md:flex xl:hidden ${isRTL ? 'font-farsi' : 'font-nunito'} shrink min-w-0 max-w-75 h-fit leading-6`}>
            {isLoadingLesson || isStatsLoading ? (
              <div className="h-5 w-48 bg-gray-200 animate-shimmer rounded" />
            ) : (
              <p className="text-[#454646] text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2">{lessonTitle}</p>
            )}
          </div>
          <div className={`flex w-full md:w-fit h-fit justify-between md:justify-end gap-2 md:gap-5 lg:gap-6 items-center shrink-0 ${isRTL ? 'md:mr-auto' : 'md:ml-auto'}`}>
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-center justify-center p-1.5 -m-1.5 rounded-lg cursor-pointer hover:bg-gray-200 active:bg-gray-300 active:scale-95 transition-all duration-200" onClick={toggleReaderMode} title="Toggle Reader Mode">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="w-8 bi bi-text-paragraph opacity-70"><path fillRule="evenodd" d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"></path></svg>
                <p className="text-[10px] w-6 text-center leading-tight mt-0.5">{readerMode === 'sentence' ? 'Sentence View' : 'Normal View'}</p>
              </div>
              <div className={`mb-auto -mt-1.5 ${isRTL ? '' : '-ml-2'} border-2 border-black rounded-full min-h-4 h-fit w-fit text-center text-xs items-center px-1`}>{currentPage + 1}</div>
            </div>
            {/* Mobile/Tablet Review Button */}
            <button className="flex lg:hidden bg-[#FFE578] hover:bg-yellow-400 text-[#C0A332] px-2 py-1.5 rounded-md font-semibold text-[10px] sm:text-xs leading-none shadow-sm items-center cursor-pointer shrink-0 transition gap-1">
              <span className="text-left leading-tight inline">Review<br />LingQs</span>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                <span className="opacity-70 text-black">({reviewCount})</span>
              </div>
            </button>
            {/* The Dropdown Container */}
            <div className="relative flex items-center" ref={dropdownRef}>
              <div className="flex items-center" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <svg width="30px" viewBox="-1.12 -1.12 18.24 18.24" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="bi bi-three-dots cursor-pointer hover:bg-gray-200 rounded-full transition-colors" stroke="#000000" strokeWidth="0.44800000000000006"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path> </g></svg>
              </div>

              {/* DROPDOWN MENU */}
              {isDropdownOpen && (
                <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-72 bg-[#1b1c1d] text-[#e0e2e5] rounded-xl shadow-2xl py-3 z-50 overflow-hidden flex flex-col font-sans animate-fade-in-fast`}>
                  {/* Dropdown Header */}
                  <div className="px-5 pb-4 pt-1 border-b border-gray-700/50 flex flex-col items-center text-center">
                    {isLoadingLesson || isStatsLoading ? (
                      <div className="h-4 w-40 bg-gray-600/50 animate-shimmer rounded mb-2 mx-auto" />
                    ) : (
                      <p className="font-bold text-[15px] leading-tight mb-2 opacity-95">{lessonTitle}</p>
                    )}
                    <div className="flex items-center justify-between w-full mt-1">
                      {prevLessonId ? (
                        <Link to={`/me/${languageCode}/reader/${prevLessonId}`} className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer">
                          {isRTL ? <ChevronRight className="w-5 h-5 text-gray-300" /> : <ChevronLeft className="w-5 h-5 text-gray-300" />}
                        </Link>
                      ) : <div className="w-8" />}
                      
                      <span className="text-[13px] font-semibold text-gray-400" dir="ltr">
                        {lessonIndex} / {courseLessonsCount || lessonIndex}
                      </span>
                      
                      {nextLessonId ? (
                        <Link to={`/me/${languageCode}/reader/${nextLessonId}`} className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer">
                          {isRTL ? <ChevronLeft className="w-5 h-5 text-gray-300" /> : <ChevronRight className="w-5 h-5 text-gray-300" />}
                        </Link>
                      ) : <div className="w-8" />}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="flex flex-col py-2 px-2 text-[14.5px] font-medium opacity-90" dir="ltr">
                    <div 
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={() => {
                        setShowLessonInfoModal(true);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Info className="w-5 h-5 text-gray-400" />
                      <span>Lesson Info</span>
                    </div>
                    <div 
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={handleDownloadAudio}
                    >
                      <Download className="w-5 h-5 text-gray-400" />
                      <span>Download Audio</span>
                    </div>
                    <div className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition">
                      <Languages className="w-5 h-5 text-gray-400" />
                      <span>Show Translation</span>
                    </div>
                    
                    <div className="h-px w-full bg-gray-700/50 my-2" />
                    
                    <div 
                      className="hidden xl:flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={() => {
                        toggleSidebar();
                        closeDropdown();
                      }}
                    >
                      {isSidebarVisible ? (
                        <>
                          <PanelRightClose className="w-5 h-5 text-gray-400" />
                          <span>Close Sidebar</span>
                        </>
                      ) : (
                        <>
                          <PanelRightOpen className="w-5 h-5 text-gray-400" />
                          <span>Open Sidebar</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition">
                      <Settings className="w-5 h-5 text-gray-400" />
                      <span>Settings</span>
                    </div>
                    <div 
                      className="xl:hidden flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={handleQuickStart}
                    >
                      <Zap className="w-5 h-5 text-gray-400" />
                      <span>Quick Start Guide</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center h-fit mt-1.5 pt-2 px-4">
          <div className={`hidden md:flex ${isRTL ? 'font-farsi' : 'font-nunito'} shrink min-w-0 max-w-60 h-fit leading-6`}>
            {isLoadingLesson || isStatsLoading ? (
              <div className="h-5 w-32 bg-gray-200 animate-shimmer rounded" />
            ) : courseId ? (
              <Link to={`/me/${languageCode}/course/${courseId}`} className="text-[#4F8EF8] hover:underline text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2" title={courseTitle}>{courseTitle}</Link>
            ) : (
              <p className="text-[#4F8EF8] text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2" title={courseTitle}>{courseTitle}</p>
            )}
          </div>
          <div className="hidden md:flex items-center mx-2 h-fit shrink-0">
            {isRTL ? <LeftArrow dim={6} /> : <RightArrow dim={6} />}
          </div>
          <div className={`hidden md:flex ${isRTL ? 'font-farsi' : 'font-nunito'} shrink min-w-0 max-w-75 h-fit leading-6`}>
            {isLoadingLesson || isStatsLoading ? (
              <div className="h-5 w-48 bg-gray-200 animate-shimmer rounded" />
            ) : (
              <p className="text-[#454646] text-[18px] font-extrabold overflow-hidden text-ellipsis line-clamp-2">{lessonTitle}</p>
            )}
          </div>
          <div className={`flex w-full md:w-fit h-fit justify-between md:justify-end gap-2 md:gap-5 lg:gap-6 items-center shrink-0 ${isRTL ? 'md:mr-auto' : 'md:ml-auto'}`}>
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-center justify-center p-1.5 -m-1.5 rounded-lg cursor-pointer hover:bg-gray-200 active:bg-gray-300 active:scale-95 transition-all duration-200" onClick={toggleReaderMode} title="Toggle Reader Mode">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="w-8 bi bi-text-paragraph opacity-70"><path fillRule="evenodd" d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"></path></svg>
                <p className="text-[10px] w-6 text-center leading-tight mt-0.5">{readerMode === 'sentence' ? 'Sentence View' : 'Normal View'}</p>
              </div>
              <div className={`mb-auto -mt-1.5 ${isRTL ? '' : ''} border-2 border-black rounded-full min-h-4 h-fit w-fit text-center text-xs items-center px-1`}>{currentPage + 1}</div>
            </div>
            {/* Mobile/Tablet Review Button */}
            <button className="flex lg:hidden bg-[#FFE578] hover:bg-yellow-400 text-[#C0A332] px-2 py-1.5 rounded-md font-semibold text-[10px] sm:text-xs leading-none shadow-sm items-center cursor-pointer shrink-0 transition gap-1">
              <span className="text-left leading-tight inline">Review<br />LingQs</span>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                <span className="opacity-70 text-black">({reviewCount})</span>
              </div>
            </button>
            {/* The Dropdown Container */}
            <div className="relative flex items-center" ref={dropdownRef}>
              <div className="flex items-center" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <svg width="30px" viewBox="-1.12 -1.12 18.24 18.24" xmlns="http://www.w3.org/2000/svg" fill="#000000" className="bi bi-three-dots cursor-pointer hover:bg-gray-200 rounded-full transition-colors" stroke="#000000" strokeWidth="0.44800000000000006"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path> </g></svg>
              </div>

              {/* DROPDOWN MENU */}
              {isDropdownOpen && (
                <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-72 bg-[#1b1c1d] text-[#e0e2e5] rounded-xl shadow-2xl py-3 z-50 overflow-hidden flex flex-col font-sans animate-fade-in-fast`}>
                  {/* Dropdown Header */}
                  <div className="px-5 pb-4 pt-1 border-b border-gray-700/50 flex flex-col items-center text-center">
                    {isLoadingLesson || isStatsLoading ? (
                      <div className="h-4 w-40 bg-gray-600/50 animate-shimmer rounded mb-2 mx-auto" />
                    ) : (
                      <p className="font-bold text-[15px] leading-tight mb-2 opacity-95">{lessonTitle}</p>
                    )}
                    <div className="flex items-center justify-between w-full mt-1">
                      {prevLessonId ? (
                        <Link to={`/me/${languageCode}/reader/${prevLessonId}`} className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer">
                          {isRTL ? <ChevronRight className="w-5 h-5 text-gray-300" /> : <ChevronLeft className="w-5 h-5 text-gray-300" />}
                        </Link>
                      ) : <div className="w-8" />}
                      
                      <span className="text-[13px] font-semibold text-gray-400" dir="ltr">
                        {lessonIndex} / {courseLessonsCount || lessonIndex}
                      </span>
                      
                      {nextLessonId ? (
                        <Link to={`/me/${languageCode}/reader/${nextLessonId}`} className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer">
                          {isRTL ? <ChevronLeft className="w-5 h-5 text-gray-300" /> : <ChevronRight className="w-5 h-5 text-gray-300" />}
                        </Link>
                      ) : <div className="w-8" />}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="flex flex-col py-2 px-2 text-[14.5px] font-medium opacity-90" dir="ltr">
                    <div 
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={() => {
                        setShowLessonInfoModal(true);
                        closeDropdown();
                      }}
                    >
                      <Info className="w-5 h-5 text-gray-400" />
                      <span>Lesson Info</span>
                    </div>
                    <div 
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={handleDownloadAudio}
                    >
                      <Download className="w-5 h-5 text-gray-400" />
                      <span>Download Audio</span>
                    </div>
                    <div className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition">
                      <Languages className="w-5 h-5 text-gray-400" />
                      <span>Show Translation</span>
                    </div>
                    
                    <div className="h-px w-full bg-gray-700/50 my-2" />
                    
                    <div 
                      className="hidden xl:flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={() => {
                        toggleSidebar();
                        closeDropdown();
                      }}
                    >
                      {isSidebarVisible ? (
                        <>
                          <PanelRightClose className="w-5 h-5 text-gray-400" />
                          <span>Close Sidebar</span>
                        </>
                      ) : (
                        <>
                          <PanelRightOpen className="w-5 h-5 text-gray-400" />
                          <span>Open Sidebar</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition">
                      <Settings className="w-5 h-5 text-gray-400" />
                      <span>Settings</span>
                    </div>
                    <div 
                      className="xl:hidden flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={handleQuickStart}
                    >
                      <Zap className="w-5 h-5 text-gray-400" />
                      <span>Quick Start Guide</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`flex max-h-[90%] grow min-h-0`}>
        <div className="w-8 sm:w-16 lg:w-28 flex flex-col items-center justify-center cursor-pointer opacity-60 hover:opacity-100 shrink-0">
          {currentPage > 0 && (
            <button onClick={() => handlePageAdvance(currentPage - 1)} className="bg-gray-200 rounded-full p-2 lg:p-4 shadow-md border border-gray-200 text-gray-500 cursor-pointer hover:text-blue-600 hover:bg-blue-100 hover:scale-105 transition-all">
              {isRTL ? <RightArrow className="w-5 h-5 sm:w-8 sm:h-8 lg:w-12 lg:h-12" /> : <LeftArrow className="w-5 h-5 sm:w-8 sm:h-8 lg:w-12 lg:h-12" />}
            </button>
          )}
        </div>

        <div className={`flex flex-col mt-2 lg:mt-4 grow min-w-0 min-h-0 ${isRTL ? 'font-farsi-trad' : 'font-nunito'} relative bg-white rounded-md`}>
          <div className={`w-full flex-1 min-h-0 overflow-hidden relative ${isRTL ? 'pt-1 pb-6 pl-5 lg:pl-9 pr-3 lg:pr-5' : 'pb-4 lg:pb-6 px-3 lg:px-5'}`}>
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
                  {renderedTree}
                </>
              )}
            </div>
          </div>
          
          {/* MORPHING PAGE DOTS FOR MOBILE/TABLET (< 1024px) */}
          <div className="flex lg:hidden w-full justify-center pb-4 shrink-0" dir="ltr">
             <MorphingPageDots total={totalPages} activeIndex={currentPage} onChange={handlePageAdvance} isRTL={isRTL} />
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

      {showQuickStartDrawer && (
        <div 
          className={`fixed inset-0 z-[110] bg-black/60 flex items-end justify-center sm:items-center sm:p-4 ${isQuickStartClosing ? 'animate-fade-out-drawer' : 'animate-fade-in-drawer'}`} 
          onClick={closeQuickStart}
        >
          <div 
            className={`w-full max-w-md ${isQuickStartClosing ? 'animate-slide-down sm:animate-none' : 'animate-slide-up sm:animate-none'}`} 
            onClick={e => e.stopPropagation()}
          >
            <div 
              className="bg-white w-full max-h-[85vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{ 
                transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
                transition: dragY > 0 ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <div 
                className="flex justify-between items-center p-4 border-b border-gray-100 bg-white shrink-0 relative sm:cursor-default cursor-grab active:cursor-grabbing select-none"
                style={{ touchAction: 'none' }}
                onTouchStart={e => handleDragStart(e.touches[0].clientY)}
                onTouchMove={e => handleDragMove(e.touches[0].clientY)}
                onTouchEnd={handleDragEnd}
                onMouseDown={e => handleDragStart(e.clientY)}
                onMouseMove={e => handleDragMove(e.clientY)}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full" />
                <h3 className="font-extrabold text-lg text-[#3a92fb] mt-2 sm:mt-0">Quick Start Guide</h3>
                <button onClick={closeQuickStart} className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer mt-2 sm:mt-0">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="overflow-y-auto grow bg-[#EEF9FF]">
                <QuickStartGuide />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ReaderPane;