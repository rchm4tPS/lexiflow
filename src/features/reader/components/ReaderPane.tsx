import React, { type ReactNode, useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Info, Download, Languages, Zap, PanelRightClose, PanelRightOpen, Settings, ChevronLeft, ChevronRight, X, SquarePen } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useReaderStore } from '../../../store/useReaderStore';
import { apiClient } from '../../../api/client';
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
    lessonIndex, courseLessonsCount, prevLessonId, nextLessonId, setShowLessonInfoModal, showSettingsDrawer, setShowSettingsDrawer, initialTokenIndex,
    isStatsLoading, lessonAudio, toggleSidebar, isSidebarVisible,
    translationData, revealedSentenceIndices, isLoadingTranslation,
    fontSize, fontFamily, lineHeight, showMargins,
    showTranslation, setShowTranslation,
    lineGap
  } = useReaderStore(useShallow(state => ({
    showSummary: state.showSummary, setShowSummary: state.setShowSummary, showModal: state.showModal, setModal: state.setModal,
    lessonStructureHash: state.lessonStructureHash, currentPage: state.currentPage, draftPhraseRange: state.draftPhraseRange,
    setDraftPhrase: state.setDraftPhrase, isRTL: state.isRTL, languageCode: state.languageCode,
    handlePageAdvance: state.handlePageAdvance, activeLessonId: state.activeLessonId, syncLessonProgress: state.syncLessonProgress,
    isLoadingLesson: state.isLoadingLesson, readerMode: state.readerMode, toggleReaderMode: state.toggleReaderMode, totalPages: state.totalPages, columnMapping: state.columnMapping, setSidebarPosition: state.setSidebarPosition, setClickPos: state.setClickPos,
    lessonIndex: state.lessonIndex, courseLessonsCount: state.courseLessonsCount, prevLessonId: state.prevLessonId, nextLessonId: state.nextLessonId, setShowLessonInfoModal: state.setShowLessonInfoModal, showSettingsDrawer: state.showSettingsDrawer, setShowSettingsDrawer: state.setShowSettingsDrawer, initialTokenIndex: state.initialTokenIndex,
    isStatsLoading: state.isStatsLoading, lessonAudio: state.lessonAudio, toggleSidebar: state.toggleSidebar, isSidebarVisible: state.isSidebarVisible,
    translationData: state.translationData, revealedSentenceIndices: state.revealedSentenceIndices, isLoadingTranslation: state.isLoadingTranslation,
    fontSize: state.fontSize, fontFamily: state.fontFamily, lineHeight: state.lineHeight, showMargins: state.showMargins,
    showTranslation: state.showTranslation,         // <--- TAMBAHKAN INI JUGA
    setShowTranslation: state.setShowTranslation,   // <--- TAMBAHKAN INI JUGA
    lineGap: state.lineGap ?? 6,
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

  // --- NEW: Drawer Drag State (mirrors Translation panel pattern) ---
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const handlePointerDown = (clientY: number) => {
    dragStartY.current = clientY;
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

  // --- Drawer drag-to-close (global window listeners, mirrors Translation panel) ---
  useEffect(() => {
    if (!showQuickStartDrawer) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (dragStartY.current === null) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const diff = clientY - dragStartY.current;
      if (diff > 0) setDragY(diff);
    };

    const handlePointerUp = () => {
      if (dragStartY.current === null) return;
      if (dragY > 80) closeQuickStart();
      dragStartY.current = null;
      setDragY(0);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [showQuickStartDrawer, dragY]);

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

  // --- Fetch Translation — proxied via backend (uses LingQ API with server-side LINGQ_TOKEN) ---
  const fetchTranslation = async (openDrawer: boolean = true) => {
    const { activeLessonId } = useReaderStore.getState();
    if (!activeLessonId) return;

    useReaderStore.getState().setIsLoadingTranslation(true);
    useReaderStore.getState().setTranslationError(null);
    useReaderStore.getState().setTranslationData([]);
    if (openDrawer) {
      // Open the panel immediately so the loading skeleton is visible
      useReaderStore.getState().setShowTranslation(true);
      closeDropdown();
    }

    try {
      const response = await apiClient(`/library/lingq-translation/${activeLessonId}`);

      if (!response || !Array.isArray(response.sentences)) {
        throw new Error('Invalid response from server.');
      }

      useReaderStore.getState().setTranslationData(response.sentences);
      if (Array.isArray(response.timestamps)) {
        useReaderStore.getState().setAudioTimestamps(response.timestamps);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch translation:', error);
      const msg = error instanceof Error ? error.message : 'Failed to load translation. Please try again.';
      useReaderStore.getState().setTranslationError(msg);
    } finally {
      useReaderStore.getState().setIsLoadingTranslation(false);
    }
  };

  // --- Sentence View: toggle inline translation reveal for a single sentence on the current page ---
  const handleToggleSentenceTranslation = (sentenceIndex: number) => {
    const { translationData, toggleSentenceReveal } = useReaderStore.getState();
    if (translationData.length === 0) {
      fetchTranslation(false);
    }
    toggleSentenceReveal(sentenceIndex);
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
  // Track previous layout settings to detect changes that require a re-measurement
  // const layoutSettingsRef = React.useRef({ showMargins, fontSize, fontFamily, lineHeight });
  // When a layout-affecting setting changes we need to force-reflow CSS multi-column.
  // We store the fact in a ref so measure() can force setColumnWidthPx even when the
  // numeric value hasn't changed (same container width → no state diff → no React re-render
  // → browser never re-lays-out → ghost columns persist).
  // const layoutChangedRef = React.useRef(false);

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
  // --- FINAL OPTIMIZED MEASUREMENT ENGINE WITH ANCHOR PRESERVATION ---
  React.useLayoutEffect(() => {
    if (!scrollContainerRef.current || isLoadingLesson || tokens.length === 0) return;

    const container = scrollContainerRef.current;

    // 1. Capture user's currently visible anchor token before layout recalculation
    const stateBefore = useReaderStore.getState();
    const currentVisibleToken =
      stateBefore.columnMapping[stateBefore.currentPage]?.[0] || anchorTokenRef.current;

    if (currentVisibleToken) {
      anchorTokenRef.current = currentVisibleToken;
    }

    const measure = (_caller = 'unknown') => {
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const availableWidth = containerRect.width;

      if (availableWidth <= 0) return;

      if (columnWidthPx === 0 && availableWidth > 0) {
        setColumnWidthPx(availableWidth);
        return;
      }

      // Temporarily remove transform so bounding boxes read true un-shifted coordinates
      const origTransform = container.style.transform;
      container.style.transform = 'none';

      const freshContainerRect = container.getBoundingClientRect();
      const columnWidthAndGap = freshContainerRect.width + 48; // 3rem gap = 48px

      const mapping: Record<number, string[]> = {};
      const tokenNodes = container.querySelectorAll('[data-token-id]');

      tokenNodes.forEach(node => {
        const id = node.getAttribute('data-token-id');
        if (!id) return;
        const rect = node.getBoundingClientRect();
        let colIndex = 0;

        if (isRTL) {
          const relativeRight = freshContainerRect.right - rect.right;
          colIndex = Math.floor((relativeRight + 5) / columnWidthAndGap);
        } else {
          const relativeLeft = rect.left - freshContainerRect.left;
          colIndex = Math.floor((relativeLeft + 5) / columnWidthAndGap);
        }

        if (colIndex < 0) colIndex = 0;
        if (!mapping[colIndex]) mapping[colIndex] = [];
        mapping[colIndex].push(id);
      });

      // Restore transform
      container.style.transform = origTransform;

      const { tokens: allTokens } = useReaderStore.getState();

      const tokenToPage: Record<string, number> = {};
      for (const [col, ids] of Object.entries(mapping)) {
        for (const id of ids) tokenToPage[id] = Number(col);
      }

      const isWordToken = (t: typeof allTokens[0]) => {
        if (t.isNewline || !t.text?.trim()) return false;
        return /[\p{L}\p{N}]/u.test(t.text);
      };

      let trueLastPage = 0;
      for (let i = allTokens.length - 1; i >= 0; i--) {
        const tok = allTokens[i];
        if (!isWordToken(tok)) continue;
        if (tok.id in tokenToPage) {
          trueLastPage = tokenToPage[tok.id];
          break;
        }
      }

      for (const col of Object.keys(mapping).map(Number)) {
        if (col > trueLastPage) delete mapping[col];
      }

      const countSigTokens = (pageIdx: number): number => {
        const ids = mapping[pageIdx];
        if (!ids) return 0;
        return ids.filter(id => {
          const t = allTokens.find(tok => tok.id === id);
          return t && isWordToken(t);
        }).length;
      };

      while (trueLastPage > 0) {
        const lastCount = countSigTokens(trueLastPage);
        if (lastCount === 0) { delete mapping[trueLastPage]; trueLastPage--; continue; }
        const prevCount = countSigTokens(trueLastPage - 1);
        if (prevCount > 0 && lastCount <= Math.max(3, Math.floor(prevCount * 0.10))) {
          delete mapping[trueLastPage]; trueLastPage--;
        } else break;
      }

      const newTotalPages = Math.max(1, trueLastPage + 1);

      if (columnWidthPx !== freshContainerRect.width && freshContainerRect.width > 0) {
        setColumnWidthPx(freshContainerRect.width);
      }

      // 2. Find which column the user's anchor token moved to in the new layout
      let newColForAnchor = -1;
      const { initialTokenIndex, tokens: storeTokens, setInitialTokenIndex } = useReaderStore.getState();

      if (initialTokenIndex !== null && initialTokenIndex >= 0 && initialTokenIndex < storeTokens.length) {
        const targetTokenId = storeTokens[initialTokenIndex].id;
        for (const [col, ids] of Object.entries(mapping)) {
          if (ids.includes(targetTokenId)) { newColForAnchor = parseInt(col); break; }
        }
        setInitialTokenIndex(null);
      } else if (anchorTokenRef.current) {
        for (const [col, ids] of Object.entries(mapping)) {
          if (ids.includes(anchorTokenRef.current)) { newColForAnchor = parseInt(col); break; }
        }
      }

      const currentTotalPages = useReaderStore.getState().totalPages;
      const currentColumnMapping = useReaderStore.getState().columnMapping;
      const mappingChanged =
        newTotalPages !== currentTotalPages ||
        Object.keys(mapping).length !== Object.keys(currentColumnMapping).length ||
        Object.entries(mapping).some(
          ([key, ids]) =>
            !currentColumnMapping[Number(key)] ||
            ids.length !== currentColumnMapping[Number(key)].length ||
            ids.some((id, i) => id !== currentColumnMapping[Number(key)]?.[i])
        );

      if (mappingChanged) {
        useReaderStore.getState().setPagination(newTotalPages || 1, mapping);
      }

      // 3. Smoothly navigate user to the exact new page of their anchor token (clamped to max pages)
      const targetPage = newColForAnchor !== -1
        ? Math.min(newColForAnchor, newTotalPages - 1)
        : Math.min(useReaderStore.getState().currentPage, newTotalPages - 1);

      const safePage = Math.max(0, targetPage);
      if (safePage !== useReaderStore.getState().currentPage) {
        useReaderStore.getState().setPage(safePage);
      }
    };

    // 1. Immediate synchronous measure
    measure('initial');

    // 2. Safety net when custom fonts finish rendering
    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (scrollContainerRef.current) measure('fonts.ready');
      });
    }

    // 3. Observer for window / container resizes
    const resizeObserver = new ResizeObserver(() => {
      if (scrollContainerRef.current) measure('ResizeObserver');
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLoadingLesson, tokens, isRTL, readerMode, columnWidthPx, showSettingsDrawer, showMargins, fontSize, fontFamily, lineHeight, lineGap]);
  
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

            const selectedTokenIds = tokens.slice(start, end + 1).map(t => t.id);

            // Single token dragged — treat as click: replace browser highlight with app highlight
            if (rangeCount === 1) {
              selection.removeAllRanges();
              if (id1) useReaderStore.getState().selectItem(id1);
              return;
            }

            // All tokens of an existing saved phrase are included in the selection — select the whole phrase
            // (same as clicking the phrase, so the blue ring sits properly on the orange div).
            // We use a subset check because the user's drag may include whitespace tokens between words.
            const currentPhrases = useReaderStore.getState().phrases;
            // Extract only learnable word tokens from the selection (ignoring whitespace/newlines)
            // so that extending an existing phrase with extra tokens is allowed (stacked phrases).
            const selectedWordTokenIds = tokens.slice(start, end + 1)
              .filter(t => t.isLearnable && !t.isNewline && t.text.match(/\p{L}/u))
              .map(t => t.id);
            const matchedPhrase = currentPhrases.find(p =>
              p.range.length > 0 &&
              p.range.every(id => selectedWordTokenIds.includes(id)) &&
              selectedWordTokenIds.every(id => p.range.includes(id))
            ) || null;

            if (matchedPhrase) {
              selection.removeAllRanges();
              useReaderStore.getState().selectItem(matchedPhrase.id);
              return;
            }

            // Original: create draft phrase for multi-token selections (2–9 learnable words)
            const isValid = !tokens.slice(start, end + 1).some(t => t.isNewline);
            const learnableCount = selectedWordTokenIds.length;

            if (isValid && learnableCount >= 2 && learnableCount <= 9) {
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
          const selectedTokens = tokens.slice(start, end + 1);
          const selectedTokenIds = selectedTokens.map(t => t.id);

          // Single token dragged — treat as click: replace browser highlight with app highlight
          if (rangeCount === 1) {
            selection.removeAllRanges();
            if (id1) useReaderStore.getState().selectItem(id1);
            return;
          }

          // All tokens of an existing saved phrase are included in the selection — select the whole phrase
          // (same as clicking the phrase, so the blue ring sits properly on the orange div).
          // We use a subset check because the user's drag may include whitespace tokens between words.
          const currentPhrases = useReaderStore.getState().phrases;
          // Extract only learnable word tokens from the selection (ignoring whitespace/newlines)
          // so that extending an existing phrase with extra tokens is allowed (stacked phrases).
          const selectedWordTokenIds = selectedTokens
            .filter(t => t.isLearnable && !t.isNewline && t.text.match(/\p{L}/u))
            .map(t => t.id);
          const matchedPhrase = currentPhrases.find(p =>
            p.range.length > 0 &&
            p.range.every(id => selectedWordTokenIds.includes(id)) &&
            selectedWordTokenIds.every(id => p.range.includes(id))
          ) || null;

          if (matchedPhrase) {
            selection.removeAllRanges();
            useReaderStore.getState().selectItem(matchedPhrase.id);
            return;
          }

          // Original: create draft phrase for multi-token selections (2–9 learnable words)
          const learnableCount = selectedWordTokenIds.length;
          const isValid = !selectedTokens.some(t => t.isNewline);

          if (isValid && learnableCount >= 2 && learnableCount <= 9) {
            const screenWidth = window.innerWidth;
            setSidebarPosition(e.clientX > screenWidth / 2 ? 'left' : 'right');
            setClickPos({ x: e.clientX, y: e.clientY });

            setDraftPhrase(selectedTokenIds);
            // Delay clearing the browser highlight so onClick can detect the text selection and abort
            setTimeout(() => selection.removeAllRanges(), 150);
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
        // Don't use DraftPhraseGroup wrapper if the selected tokens exactly form an existing saved phrase
        // (same tokens, same set). When the draft extends beyond a saved phrase (stacked phrases),
        // the DraftPhraseGroup wrapper must still be shown so the blue highlight covers A-C.
        const belongsToSavedPhrase = availablePhrases.some(p =>
          p.range.length > 0 &&
          p.range.length === draftPhraseRange.length &&
          p.range.every(id => draftPhraseRange.includes(id))
        );
        if (!belongsToSavedPhrase) {
          hasDraftPhrase = true;
          draftStartIndex = tokensList.findIndex(t => draftPhraseRange.includes(t.id));
          draftEndIndex = tokensList.length - 1 - tokensList.slice().reverse().findIndex(t => draftPhraseRange.includes(t.id));
        }
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

  // Sentence View: every token on the current page belongs to the same sentence (see the
  // column-break logic in renderTree below), so the first mapped token's index is enough.
  const currentSentenceIndex = React.useMemo(() => {
    if (readerMode !== 'sentence') return null;
    const idsOnPage = columnMapping[currentPage] || [];
    for (const id of idsOnPage) {
      const t = tokens.find(tk => tk.id === id);
      if (t?.sentencePageIndex !== undefined) return t.sentencePageIndex;
    }
    return null;
  }, [readerMode, columnMapping, currentPage, tokens]);

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
  }, [
    lessonStructureHash, courseId, languageCode, courseTitle, lessonImg, lessonTitle, 
    isRTL, handleWordClick, handlePhraseClick, readerMode, draftPhraseRange, isLoadingLesson,
    showMargins, fontSize, fontFamily, lineHeight, // <--- PASTIKAN showMargins ADA DI SINI agar token tree re-render seketika!
    lineGap
  ]);


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
                    <Link
                      to={`/me/${languageCode}/import/edit/${activeLessonId}`}
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={closeDropdown}
                    >
                      <SquarePen className="w-5 h-5 text-gray-400" />
                      <span>Edit Lesson</span>
                    </Link>
                    <div
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={handleDownloadAudio}
                    >
                      <Download className="w-5 h-5 text-gray-400" />
                      <span>Download Audio</span>
                    </div>
                    <div
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={() => {
                        fetchTranslation();
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Languages className="w-5 h-5 text-gray-400" />
                      <span>Show Translation</span>
                    </div>

                    <div className="h-px w-full bg-gray-700/50 my-2" />

                    <div
                      className="hidden xl:flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={() => {
                        const isAnySidebarOpen = isSidebarVisible || showSettingsDrawer || showTranslation;

                        if (isAnySidebarOpen) {
                          if (isSidebarVisible) toggleSidebar();
                          setShowSettingsDrawer(false);
                          setShowTranslation(false);
                        } else {
                          toggleSidebar();
                        }
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
                    <div
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={() => {
                        setShowSettingsDrawer(true);
                        closeDropdown();
                      }}
                    >
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
                    <Link
                      to={`/me/${languageCode}/import/edit/${activeLessonId}`}
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={closeDropdown}
                    >
                      <SquarePen className="w-5 h-5 text-gray-400" />
                      <span>Edit Lesson</span>
                    </Link>
                    <div
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={handleDownloadAudio}
                    >
                      <Download className="w-5 h-5 text-gray-400" />
                      <span>Download Audio</span>
                    </div>
                    <div
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={() => {
                        fetchTranslation();
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Languages className="w-5 h-5 text-gray-400" />
                      <span>Show Translation</span>
                    </div>

                    <div className="h-px w-full bg-gray-700/50 my-2" />

                    <div
                      className="hidden xl:flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={() => {
                        const isAnySidebarOpen = isSidebarVisible || showSettingsDrawer || showTranslation;

                        if (isAnySidebarOpen) {
                          if (isSidebarVisible) toggleSidebar();
                          setShowSettingsDrawer(false);
                          setShowTranslation(false);
                        } else {
                          toggleSidebar();
                        }
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
                    <div
                      className="flex items-center gap-4 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                      onClick={() => {
                        setShowSettingsDrawer(true);
                        closeDropdown();
                      }}
                    >
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
          <div className={`w-full min-h-0 overflow-hidden relative ${readerMode === 'sentence' ? 'shrink-0' : 'flex-1'} ${isRTL ? 'pt-1 pb-3 lg:pb-6 pl-5 lg:pl-9 pr-3 lg:pr-5' : 'pb-3 lg:pb-6 px-3 lg:px-5'}`}>
            <div
              key={`reader-container-${showMargins}-${fontSize}-${fontFamily}-${lineHeight}-${lineGap}`}
              ref={scrollContainerRef}
              className={`w-full ${readerMode === 'sentence' ? 'h-auto' : 'h-full'} text-gray-800 font-medium`}
              style={{
                direction: isRTL ? 'rtl' : 'ltr',
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily === 'farsi'
                  ? '"Parastoo", "Tahoma", "Courier New", serif'
                  : fontFamily === 'farsi-trad'
                    ? '"LingqFont", serif'
                    : '"Nunito", sans-serif',
                lineHeight,
                columnWidth: columnWidthPx > 0 ? `${columnWidthPx}px` : 'auto',
                columnGap: '3rem',
                columnFill: 'auto',
                transform: `translateX(calc(${isRTL ? '' : '-'}${currentPage} * (100% + 3rem)))`,
                transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)',  // <--- TAMBAHKAN INI (Animasi Slide Mulus)
                willChange: 'transform',                                      // <--- TAMBAHKAN INI (Akselerasi GPU)
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

          {/* SENTENCE VIEW: inline per-sentence translation reveal */}
          {readerMode === 'sentence' && !isLoadingLesson && currentSentenceIndex !== null && (
            <div className="flex-1 px-3 lg:px-5 pt-2 pb-2">
              <button
                onClick={() => handleToggleSentenceTranslation(currentSentenceIndex)}
                className="flex items-center gap-1.5 text-[#3a92fb] hover:text-blue-600 text-sm font-semibold cursor-pointer transition"
              >
                <Languages className="w-4 h-4" />
                {revealedSentenceIndices.has(currentSentenceIndex) ? 'Hide Translation' : 'Show Translation'}
              </button>
              {revealedSentenceIndices.has(currentSentenceIndex) && (
                <div className="mt-1.5 text-gray-600 text-[15px] leading-relaxed">
                  {isLoadingTranslation ? (
                    <div className="h-5 bg-gray-200 animate-shimmer rounded w-2/3" />
                  ) : (
                    translationData[currentSentenceIndex] || 'Translation unavailable for this sentence.'
                  )}
                </div>
              )}
            </div>
          )}

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
                dir="ltr"
                style={{ touchAction: 'none' }}
                onTouchStart={e => handlePointerDown(e.touches[0].clientY)}
                onMouseDown={e => handlePointerDown(e.clientY)}
              >
                <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full" />
                <h3 className="font-extrabold text-lg text-[#3a92fb] mt-2 sm:mt-0">Quick Start Guide</h3>
                <button onClick={closeQuickStart} className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer mt-2 sm:mt-0">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="overflow-y-auto grow bg-[#EEF9FF]" dir="ltr">
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