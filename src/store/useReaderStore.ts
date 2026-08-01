// frontend/src/store/useReaderStore.ts
/**
 * TODO: PAGINATION BUG INVESTIGATION & HANDOVER NOTES
 * 
 * Issue: Reader pagination resets to Page 1 (Page 0) on hard refresh (F5), re-visiting a lesson,
 * or switching between Paragraph View and Sentence View.
 * 
 * Root Cause Analysis:
 * 1. Database Overwrite: `syncLessonProgress()` evaluates `columnMapping[currentPage]` or `initialTokenIndex`.
 *    When `ReaderPane.tsx` calls `setInitialTokenIndex(null)` after mounting to clear the initial anchor,
 *    subsequent `syncLessonProgress()` calls read `initialTokenIndex = null` and fall back to `0`,
 *    overwriting `highest_page_read` in the SQLite DB (`user_lesson_progress` table) with `0`.
 * 2. Asynchronous Column Measurement vs Pagination Clamping: In `ReaderPane.tsx`, `measure()` calculates CSS multi-column
 *    token positions asynchronously after DOM mount. During the first layout pass, `columnWidthPx` is `0`, causing
 *    `columnMapping` to be empty `{}`. Calling `setPagination()` before `columnMapping` is built clamps `currentPage` to `0`.
 * 3. Sentence View Page Index Mapping: In Sentence View (`readerMode === 'sentence'`), pages map 1-to-1 with `sentencePageIndex`.
 *    If `initialTokenIndex` (the raw token offset from DB) is not mapped to `sentencePageIndex` before `setPagination()` commits,
 *    Sentence View falls back to Page 0.
 * 4. Disappearing Text Gap / Header Box Height Offset: In Paragraph View, hiding the 150px lesson title header box on `currentPage > 0`
 *    causes CSS multi-column height to change between Page 0 and Page 1, causing column break reflow and hiding tokens (e.g. lines G & H).
 * 
 * Required Architecture for Next AI / Developer:
 * - Decouple `savedHighestTokenIndex` (permanent progress state) from `initialTokenIndex` (transient DOM scroll anchor).
 * - Ensure `syncLessonProgress` never writes `0` to DB when `savedHighestTokenIndex > 0`.
 * - Synchronize `sentencePageIndex` conversion atomically before `setPagination()` renders the DOM tree.
 */
import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { apiClient, BASE_URL } from '../api/client'; // Your fetch wrapper
import { buildPhraseInstances } from '../utils/phraseMatcher';
import { assignSentencePageIndexToTokens } from '../utils/sentenceUtils';
import { getTier } from '../constants/tiers';
import { LEVELS } from '../constants/levels';
import type { Token, Phrase, DbPhrase, Lesson, Course, CourseDetail, UpdatePayload, WordHint, UserStats } from '../types/reader';

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

interface SupportedLanguage {
  code: string;
  name: string;
  isRTL: boolean;
}

interface ReaderState {
  currentUsername: string;

  courseId: string | null;
  courseTitle: string;
  courseLevel: string | null;
  lessonTitle: string;
  lessonImg: string | null;
  lessonAudio: string | null;
  lessonDuration: number;
  authorName: string;
  readTimes: number;
  totalListenedSec: number;
  lessonIndex: number;
  courseLessonsCount: number;

  guidedCourses: Course[];
  activeCourseDetails: CourseDetail | null;
  activeLessonId: string | null;
  activeLessonOwnerId: string | null;
	prevLessonId: string | null;
	nextLessonId: string | null;
	originalText: string;


  myCourses: Lesson[];       // Lesson feed
  myCoursesDropdown: Course[]; // Actual courses (for dropdown in Import Lesson)
  myLessons: Lesson[];         // In-progress lessons (not completed)
  completedLessons: Lesson[];  // Completed lessons
  continueStudying: Lesson[];  // Top 4 most recent visits
  myLessonsSubTab: 'continue' | 'completed';
  librarySidebarTab: 'lesson-feed' | 'guided-course';

  activeWordHints: WordHint[];
  isLoadingHints: boolean;

  tokens: Token[];
  tokenMap: Record<string, Token>;
  dbPhrases: DbPhrase[]; // Stores raw phrases from DB (could be refined further if needed)
  phrases: Phrase[];   // Calculated instances mapping over tokens
  phraseMap: Record<string, Phrase>;
  languageCode: string;
  isStatsLoading: boolean;
  availableLanguages: SupportedLanguage[];
  enrolledLanguages: string[];

  userTags: string[];

  currentPage: number;
  selectedId: string | null;
  draftPhraseRange: string[] | null;
  clickPos: { x: number, y: number } | null;

  totalCoins: number;
  totalKnownWords: number;
  totalStreaks: number;
  totalDailyLingqs: number;
  totalDailyLingqsLearned: number;
  totalDailyListeningSec: number;
  totalDailyWordsRead: number;
  last7DaysStats: UserStats[];
  last30DaysStats: UserStats[];
  dailyGoalTier: string;

  sessionListeningTicks: number;

  showSummary: boolean;
  showModal: boolean;
  showLessonInfoModal: boolean;
  isRTL: boolean;
  hasFulfilledToday: boolean;
  hasImportedFromLingq: boolean;
  isLoadingLesson: boolean;
  librarySearch: string;
  minLevelIndex: number;
  maxLevelIndex: number;
  setLevelRange: (minIdx: number, maxIdx: number) => void;
  readerMode: 'paragraph' | 'sentence';
  initialTokenIndex: number | null;
  setInitialTokenIndex: (idx: number | null) => void;

  setRTL: (rtl: boolean) => void;
  incrementListeningTicks: (amount: number) => void;

  initializeUserState: (id: string, lang?: string) => Promise<void>;
  fetchLanguages: () => Promise<void>;
  switchLanguage: (code: string) => Promise<void>;
  updateDailyGoalTier: (tier: string) => Promise<void>;
  updateDailyStats: (metrics: { created?: number; learned?: number; listening?: number; words?: number }) => void;

  recalculateStats: (lang?: string) => Promise<void>;
  syncLanguageWithUrl: (code: string) => Promise<void>;
  syncTokenStage: (text: string, newStage: number, meaning?: string, notes?: string) => void;
  syncPhraseStage: (phraseId: string, newStage: number, meaning?: string, notes?: string) => void;

  fetchGuidedCourses: () => Promise<void>;
  fetchCourseDetails: (courseId: string) => Promise<void>;
  clearActiveCourse: () => void;

  // Lesson-level bookmarking
  toggleLessonBookmark: (lessonId: string) => Promise<void>;

  fetchLibrary: () => Promise<void>;
  fetchMyLessons: () => Promise<void>;
  setLibrarySearch: (term: string) => void;
  fetchContinueStudying: () => Promise<void>;
  checkAndUpdateCompletions: () => Promise<void>;

  setMyLessonsSubTab: (tab: 'continue' | 'completed') => void;
  setLibrarySidebarTab: (tab: 'lesson-feed' | 'guided-course') => void;
  toggleReaderMode: () => void;

  fetchMyCoursesDropdown: () => Promise<void>;
  createCourse: (title: string, level: string, description?: string, imageUrl?: string, isPublic?: boolean) => Promise<Course | undefined>;
  importLesson: (courseId: string, title: string, rawText: string, imageUrl?: string, description?: string, audioUrl?: string, isPublic?: boolean, audioDuration?: number, originalUrl?: string) => Promise<string | null>;

  fetchLingqRecommendedCourses: (apiKey?: string) => Promise<any[]>;
  fetchLingqCourseLessons: (courseId: string, apiKey?: string) => Promise<any>;
  fetchLingqImportedIds: () => Promise<{ importedIds: number[], importedToday: number, maxQuota: number }>;
  importFromLingq: (apiKey: string, selectedLessons: any[]) => Promise<{ success: boolean; count: number }>;


  fetchHints: (word: string) => Promise<void>;

  fetchLesson: (lessonId: string) => Promise<void>;

  fetchUserTags: () => Promise<void>;
  updateStage: (payload: UpdatePayload) => Promise<void>;
  deleteLesson: (lessonId: string) => Promise<void>;
  deleteCourse: (courseId: string, confirm?: boolean) => Promise<{ success: boolean; error?: string; message?: string }>;

  // Actions
  setPage: (page: number) => void;
  selectItem: (tokenId: string) => void;
  clearSelection: () => void;

  setDraftPhrase: (range: string[] | null) => void;
  createPhrase: (range: string[], meaning: string) => void;

  setModal: (show: boolean) => void;
  setShowLessonInfoModal: (show: boolean) => void;
  completeLesson: () => void;
  setShowSummary: (show: boolean) => void;
  resetCompletion: () => void;
  clearLessonSession: () => void;

  syncLessonProgress: (lessonId: string, isCompleted?: boolean, incrementReadTime?: boolean, triggerRecalculateStats?: boolean) => Promise<void>;

  // Navigation helpers
  navigateWord: (direction: 'next' | 'prev', onlyBlue: boolean) => void;
  navigatePhrase: (direction: 'next' | 'prev') => void;
  goToEdgePage: (edge: 'first' | 'last') => void;
  getPageForToken: (tokenId: string) => number;

  // Reading-session trackers
  sessionWordsRead: number;
  readTokenIds: Set<string>;
  sessionDailyLingqs: number;
  sessionDailyLingqsLearned: number;
  pageEnterTime: number;

  // Dynamic CSS Pagination State
  totalPages: number;
  columnMapping: Record<number, string[]>;
  setPagination: (totalPages: number, columnMapping: Record<number, string[]>, overridePage?: number) => void;

  handlePageAdvance: (newPage: number) => void;
  ticksSinceLastSync: number;
  markTokensAsRead: (tokenIds: string[]) => void;

  // Layout State
  sidebarPosition: 'left' | 'right';
  setSidebarPosition: (pos: 'left' | 'right') => void;
  setClickPos: (pos: { x: number, y: number } | null) => void;
  isSidebarVisible: boolean;
  toggleSidebar: () => void;

  lessonStructureHash: number;

  // Translation State
  showTranslation: boolean;
  translationData: string[];
  isLoadingTranslation: boolean;
  translationError: string | null;
  setShowTranslation: (show: boolean) => void;
  setTranslationData: (data: string[]) => void;
  setIsLoadingTranslation: (loading: boolean) => void;
  setTranslationError: (error: string | null) => void;

  // Audio-sync State — sentence-level start/end timestamps (seconds), aligned by index
  // with each token's sentencePageIndex.
  audioTimestamps: { start: number; end: number }[] | null;
  savedHighestTokenIndex: number;
  activeSentenceIndex: number | null;
  isAudioPlaying: boolean;
  playingSentenceIndex: number | null;
  sentenceAudioTrigger: { sentenceIndex: number; action: 'play' | 'stop'; id: number } | null;
  setAudioTimestamps: (timestamps: { start: number; end: number }[] | null) => void;
  setActiveSentenceIndex: (index: number | null) => void;
  setIsAudioPlaying: (playing: boolean) => void;
  setPlayingSentenceIndex: (index: number | null) => void;
  playSentenceAudio: (sentenceIndex: number) => void;
  stopSentenceAudio: () => void;
  syncPageWithinSentence: (sentenceIndex: number, timeFraction: number) => void;

  // Sentence View — per-sentence inline translation reveal (independent of the Translation drawer)
  revealedSentenceIndices: Set<number>;
  toggleSentenceReveal: (index: number) => void;

  // Reader Settings (drawer)
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  showMargins: boolean;
  lineGap: number;
  showSettingsDrawer: boolean;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  setLineHeight: (height: number) => void;
  setShowMargins: (show: boolean) => void;
  setLineGap: (gap: number) => void;
  setShowSettingsDrawer: (show: boolean) => void;

  isLayoutReady: boolean;
  setIsLayoutReady: (ready: boolean) => void;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  currentUsername: "",

  courseId: null,
  courseTitle: "",
  courseLevel: "",
  lessonTitle: "",
  lessonImg: null,
  lessonAudio: null,
  lessonDuration: 0,
  authorName: 'LingQ',
  readTimes: 0,
  totalListenedSec: 0,
  lessonIndex: 0,
  courseLessonsCount: 0,

  guidedCourses: [],
  activeCourseDetails: null,
  activeLessonId: null,
  activeLessonOwnerId: null,
  savedHighestTokenIndex: 0,
  prevLessonId: null,
  nextLessonId: null,
  originalText: '',

  myCourses: [],
  myCoursesDropdown: [],
  myLessons: [],
  completedLessons: [],
  continueStudying: [],
  myLessonsSubTab: 'continue',
  librarySidebarTab: 'lesson-feed',

  sidebarPosition: 'right',
  setSidebarPosition: (pos: 'left' | 'right') => set({ sidebarPosition: pos }),
  setClickPos: (pos) => set({ clickPos: pos }),
  isSidebarVisible: true,
  toggleSidebar: () => set(state => ({ isSidebarVisible: !state.isSidebarVisible })),

  lessonStructureHash: 0,

  activeWordHints: [],
  isLoadingHints: false,

  tokens: [],
  tokenMap: {},
  dbPhrases: [],
  phrases: [],
  phraseMap: {},
  languageCode: '',
  isStatsLoading: false,
  availableLanguages: [],
  enrolledLanguages: [],

  userTags: [],

  currentPage: 0,
  selectedId: null,
  draftPhraseRange: null,
  clickPos: null,

  totalCoins: 0,
  totalKnownWords: 0,
  totalStreaks: 0,
  totalDailyLingqs: 0,
  totalDailyLingqsLearned: 0,
  totalDailyListeningSec: 0,
  totalDailyWordsRead: 0,
  last7DaysStats: [],
  last30DaysStats: [],
  dailyGoalTier: 'calm',

  sessionListeningTicks: 0,

  sessionWordsRead: 0,
  readTokenIds: new Set<string>(),
  sessionDailyLingqs: 0,
  sessionDailyLingqsLearned: 0,
  pageEnterTime: Date.now(),

  totalPages: 1,
  columnMapping: {},

  ticksSinceLastSync: 0,

  showSummary: false,
  showModal: false,
  showLessonInfoModal: false,
  isRTL: false,

  hasFulfilledToday: false,
  hasImportedFromLingq: false,
  isLoadingLesson: false,
  librarySearch: '',
  minLevelIndex: 0,
  maxLevelIndex: 5,
  setLevelRange: (minIdx, maxIdx) => set({ minLevelIndex: minIdx, maxLevelIndex: maxIdx }),
  readerMode: (localStorage.getItem('lingq_reader_mode') as 'paragraph' | 'sentence') || 'paragraph',
  initialTokenIndex: null,
  setInitialTokenIndex: (idx) => set({ initialTokenIndex: idx }),

  showTranslation: false,
  translationData: [],
  isLoadingTranslation: false,
  translationError: null,
  setShowTranslation: (show) => set({ showTranslation: show }),
  setTranslationData: (data) => set({ translationData: data }),
  setIsLoadingTranslation: (loading) => set({ isLoadingTranslation: loading }),
  setTranslationError: (error) => set({ translationError: error }),

  audioTimestamps: null,
  activeSentenceIndex: null,
  isAudioPlaying: false,
  playingSentenceIndex: null,
  sentenceAudioTrigger: null,
  setAudioTimestamps: (timestamps) => set({ audioTimestamps: timestamps }),
  setActiveSentenceIndex: (index) => {
    set({ activeSentenceIndex: index });
    if (index === null) return;
    get().syncPageWithinSentence(index, 0);
  },
  setIsAudioPlaying: (playing) => set({ isAudioPlaying: playing }),
  setPlayingSentenceIndex: (index) => set({ playingSentenceIndex: index }),
  playSentenceAudio: (sentenceIndex) => set({
    sentenceAudioTrigger: { sentenceIndex, action: 'play', id: Date.now() }
  }),
  stopSentenceAudio: () => set({
    sentenceAudioTrigger: { sentenceIndex: -1, action: 'stop', id: Date.now() }
  }),
  // A sentence can span multiple pages (Sentence View forces a page break per sentence,
  // but Paragraph View pages are laid out by column width and don't respect sentence
  // boundaries at all). We can't just jump to the sentence's *first* page and stop —
  // once playback progresses past that page's last token, the page needs to keep
  // advancing through every page the sentence spans. `timeFraction` (0..1 progress
  // through the sentence's [start,end] window) picks which of the sentence's tokens
  // "should" be visible right now, and we page to wherever that token lives.
  syncPageWithinSentence: (sentenceIndex, timeFraction) => {
    const { tokens, columnMapping, currentPage, setPage } = get();
    const tokensInSentence = tokens.filter(t => t.sentencePageIndex === sentenceIndex);
    if (tokensInSentence.length === 0) return;

    const clampedFraction = Math.min(1, Math.max(0, timeFraction));
    const targetIndex = Math.min(
      tokensInSentence.length - 1,
      Math.floor(clampedFraction * tokensInSentence.length)
    );
    const targetTokenId = tokensInSentence[targetIndex].id;

    for (const [page, ids] of Object.entries(columnMapping)) {
      if (ids.includes(targetTokenId)) {
        const pageNum = Number(page);
        if (pageNum !== currentPage) setPage(pageNum);
        return;
      }
    }
  },

  revealedSentenceIndices: new Set<number>(),
  toggleSentenceReveal: (index) => {
    set((state) => {
      const next = new Set(state.revealedSentenceIndices);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { revealedSentenceIndices: next };
    });
  },

  // Reader Settings defaults
  fontSize: 16,
  fontFamily: 'nunito',
  lineHeight: 1.75,
  showMargins: true,
  lineGap: 6, // default 6px
  showSettingsDrawer: false,
  setFontSize: async (size) => {
    set({ fontSize: size });
    try {
      await apiClient('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ readerSettings: { fontSize: size } })
      });
    } catch (err) { console.error('Failed to save font size preference', err); }
  },
  setFontFamily: async (font) => {
    set({ fontFamily: font });
    try {
      await apiClient('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ readerSettings: { fontFamily: font } })
      });
    } catch (err) { console.error('Failed to save font family preference', err); }
  },
  setLineHeight: async (height) => {
    set({ lineHeight: height });
    try {
      await apiClient('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ readerSettings: { lineHeight: height } })
      });
    } catch (err) { console.error('Failed to save line height preference', err); }
  },
  setShowMargins: async (show) => {
    set({ showMargins: show });
    try {
      await apiClient('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ readerSettings: { showMargins: show } })
      });
    } catch (err) { console.error('Failed to save margins preference', err); }
  },
  setLineGap: async (lineGap) => { 
    set({ lineGap });
    try {
      await apiClient('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ readerSettings: { lineGap: lineGap } })
      });
    } catch (err) { console.error('Failed to save line gap preference', err); }
  },
  setShowSettingsDrawer: (show) => set({ showSettingsDrawer: show }),

  incrementListeningTicks: (amount: number) => {
    set((s) => ({
      sessionListeningTicks: s.sessionListeningTicks + amount,
      ticksSinceLastSync: s.ticksSinceLastSync + amount
    }));
    get().updateDailyStats({ listening: amount });

    // Periodic Heartbeat Sync (every 60 seconds of playback)
    const { ticksSinceLastSync, activeLessonId } = get();
    if (ticksSinceLastSync >= 60 && activeLessonId) {
      set({ ticksSinceLastSync: 0 });
      get().syncLessonProgress(activeLessonId);
    }
  },

  setRTL: (rtl) => set({ isRTL: rtl }),

  fetchLanguages: async () => {
    try {
      const data = await apiClient('/auth/languages');
      set({ availableLanguages: data });
    } catch (err) { console.error("Failed to fetch languages", err); }
  },

  switchLanguage: async (code: string) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;

      // Update backend preference
      await apiClient('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ targetLanguage: code })
      });

      console.log(`Updated language preference to: ${code}`);
      // NOTE: We DO NOT update local state here anymore!
      // This prevents a race condition. The state reset and re-initialization 
      // is now exclusively handled by `syncLanguageWithUrl` triggered by React Router's URL change.
    } catch (err) {
      console.error("Failed to switch language", err);
    }
  },

  syncLanguageWithUrl: async (code: string) => {
    const state = get();
    if (state.languageCode === code) return;

    console.log(`Syncing store language with URL: ${code}`);

    // Aggressively reset language-specific state
    set({
      languageCode: code,
      isStatsLoading: true,
      totalCoins: 0,
      totalKnownWords: 0,
      totalStreaks: 0,
      totalDailyLingqs: 0,
      totalDailyLingqsLearned: 0,
      totalDailyListeningSec: 0,
      totalDailyWordsRead: 0,
      last7DaysStats: [],
      last30DaysStats: [],
      dailyGoalTier: 'calm',
      hasFulfilledToday: false,
      enrolledLanguages: [],
      hasImportedFromLingq: false,
      isRTL: false,
      currentUsername: '',
      guidedCourses: [],
      activeCourseDetails: null,
      myCourses: [],
      myCoursesDropdown: [],
      myLessons: [],
      completedLessons: [],
      continueStudying: [],
      tokens: [],
      dbPhrases: [],
      phrases: [],
      activeLessonId: null,
      currentPage: 0,
      sessionDailyLingqs: 0,
      sessionDailyLingqsLearned: 0,
      sessionListeningTicks: 0,
      sessionWordsRead: 0,
      librarySearch: '',
      showSummary: false,
      showModal: false
    });

    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      await state.initializeUserState(userId, code);
    }
  },

  initializeUserState: async (id: string, lang?: string) => {
    try {
      const cacheBuster = `t=${Date.now()}`;
      const endpoint = lang
        ? `/auth/info/${id}?lang=${lang}&${cacheBuster}`
        : `/auth/info/${id}?${cacheBuster}`;
      const initUserData = await apiClient(endpoint);

      // Prevent race conditions: if the user rapidly switched languages, 
      // the store's languageCode will no longer match the lang we just fetched.
      // In that case, we discard this stale response.
      if (lang && get().languageCode !== lang) {
        console.warn(`Discarded stale fetch for ${lang} because current language is ${get().languageCode}`);
        set({ isStatsLoading: false });
        return;
      }

      set({
        currentUsername: initUserData.username,
        languageCode: initUserData.languageCode,
        totalKnownWords: initUserData.knownWords,
        totalCoins: initUserData.totalCoins,
        totalStreaks: initUserData.totalStreaks,
        totalDailyLingqs: initUserData.totalDailyLingqs || 0,
        totalDailyLingqsLearned: initUserData.totalDailyLingqsLearned || 0,
        totalDailyListeningSec: initUserData.totalDailyListeningSec || 0,
        totalDailyWordsRead: initUserData.totalDailyWordsRead || 0,
        hasImportedFromLingq: initUserData.hasImportedFromLingq ?? false,
        isRTL: initUserData.isRTL ?? false,
        last7DaysStats: initUserData.stats7d || [],
        last30DaysStats: initUserData.stats30d || [],
        enrolledLanguages: initUserData.enrolledLanguages || [],
        isStatsLoading: false,
        dailyGoalTier: initUserData.dailyGoalTier || 'calm',
        fontSize: initUserData.preferences?.readerSettings?.fontSize ?? 16,
        fontFamily: initUserData.preferences?.readerSettings?.fontFamily ?? 'nunito',
        lineHeight: initUserData.preferences?.readerSettings?.lineHeight ?? 1.75,
        showMargins: initUserData.preferences?.readerSettings?.showMargins ?? true,
        lineGap: initUserData.preferences?.readerSettings?.lineGap ?? 6,
        hasFulfilledToday: (initUserData.totalDailyLingqs >= getTier(initUserData.dailyGoalTier).lingqGoal) &&
          (initUserData.totalDailyListeningSec >= getTier(initUserData.dailyGoalTier).listenMinGoal * 60)
      });

    } catch (err) {
      console.error("Failed to fetch user state", err);
      set({ isStatsLoading: false });
    }
  },

  updateDailyStats: (metrics: { created?: number; learned?: number; listening?: number; words?: number }) => {
    set((state) => {
      const { created = 0, learned = 0, listening = 0, words = 0 } = metrics;
      return {
        totalDailyLingqs: state.totalDailyLingqs + created,
        totalDailyLingqsLearned: state.totalDailyLingqsLearned + learned,
        totalDailyListeningSec: state.totalDailyListeningSec + listening,
        totalDailyWordsRead: state.totalDailyWordsRead + words,
        sessionDailyLingqs: state.sessionDailyLingqs + created,
        sessionDailyLingqsLearned: state.sessionDailyLingqsLearned + learned,
        // sessionWordsRead is updated by setPage, and UI sums it with totalDailyWordsRead
        // We only add other metrics here for live feedback
        last7DaysStats: state.last7DaysStats.map((s, i) =>
          i === state.last7DaysStats.length - 1
            ? { ...s, created: s.created + created, learned: s.learned + learned, listening: s.listening + listening, words: s.words + words }
            : s
        ),
        last30DaysStats: state.last30DaysStats.map((s, i) =>
          i === state.last30DaysStats.length - 1
            ? { ...s, created: s.created + created, learned: s.learned + learned, listening: s.listening + listening, words: s.words + words }
            : s
        )
      };
    });

    // Check for optimistic streak increment
    const state = get();
    const tier = getTier(state.dailyGoalTier);
    const fulfilledLingq = state.totalDailyLingqs >= tier.lingqGoal;
    const fulfilledListening = state.totalDailyListeningSec >= (tier.listenMinGoal * 60);

    if (!state.hasFulfilledToday && fulfilledLingq && fulfilledListening) {
      set({
        hasFulfilledToday: true,
        totalStreaks: state.totalStreaks + 1
      });
      // Push to backend immediately to ensure streak is persisted even on refresh
      if (state.activeLessonId) {
        get().syncLessonProgress(state.activeLessonId);
      }
    }
  },

  updateDailyGoalTier: async (tier: string) => {
    try {
      const { languageCode } = get();
      const response = await apiClient('/auth/goal-tier', {
        method: 'PATCH',
        body: JSON.stringify({ tier, languageCode })
      });
      if (response.success) {
        set({ dailyGoalTier: tier });
      }
    } catch (err) {
      console.error("Failed to update daily goal tier", err);
    }
  },

  recalculateStats: async () => {
    try {
      const state = get();
      const lang = state.languageCode || 'de';

      const response = await apiClient('/vocab/recalculate-stats', {
        method: 'POST',
        body: JSON.stringify({ languageCode: lang })
      });

      // Prevent race condition: if language changed while fetching, discard response
      if (get().languageCode !== lang) {
        console.warn(`Discarded stale recalculateStats for ${lang}`);
        return;
      }

      if (response.success) {
        set({
          totalCoins: response.trueCoins,
          totalKnownWords: response.trueKnown,
          // totalDailyLingqs is intentionally NOT updated here — it's a daily metric
          // from user_daily_stats.lingqs_created, not the lifetime total_lingqs.
          // The two are unrelated; the /vocab/list count naturally differs from
          // user_languages.total_lingqs because the former is a live COUNT(*) and
          // the latter is an incrementally-maintained aggregate.
        });
        console.log("✅ Stats Recalculated:", response);
      }
    } catch (err) {
      console.error("Failed to recalculate stats", err);
    }
  },

  fetchGuidedCourses: async () => {
    try {
      const state = get();
      const lang = state.languageCode || 'de';
      const search = state.librarySearch;
      const data = await apiClient(`/library/guided-courses?lang=${lang}&search=${encodeURIComponent(search)}`);
      if (get().languageCode !== lang) return;
      if (data) {
        set({ guidedCourses: data });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("Failed to fetch guided courses:", message);
    }
  },

  fetchCourseDetails: async (courseId: string) => {
    try {
      const data = await apiClient(`/library/courses/${courseId}/lessons`);
      set({ activeCourseDetails: data });
    } catch (err) { console.error(err); }
  },

  clearActiveCourse: () => set({ activeCourseDetails: null }),

  // Toggle bookmark on an individual lesson
  toggleLessonBookmark: async (lessonId: string) => {
    try {
      const res = await apiClient(`/library/lessons/${lessonId}/bookmark`, { method: 'POST' });

      // Optimistically update all lesson arrays
      const updateList = (list: Lesson[]) => list.map(l =>
        l.id === lessonId ? { ...l, is_bookmarked: res.bookmarked } : l
      );

      set((state) => ({
        myLessons: updateList(state.myLessons),
        completedLessons: updateList(state.completedLessons),
        myCourses: updateList(state.myCourses),
        activeCourseDetails: state.activeCourseDetails
          ? {
            ...state.activeCourseDetails,
            lessons: updateList(state.activeCourseDetails.lessons || []),
          }
          : null,
      }));
    } catch (err) { console.error(err); }
  },

  fetchLibrary: async () => {
    try {
      const state = get();
      const lang = state.languageCode || 'de';
      const search = state.librarySearch;
      const minLevel = LEVELS[state.minLevelIndex] || 'Beginner 1';
      const maxLevel = LEVELS[state.maxLevelIndex] || 'Advanced 2';
      const data = await apiClient(`/library/feed/${lang}?search=${encodeURIComponent(search)}&minLevel=${encodeURIComponent(minLevel)}&maxLevel=${encodeURIComponent(maxLevel)}`);
      if (get().languageCode !== lang) return;
      if (data) {
        set({ myCourses: data });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("Failed to fetch library feed:", message);
    }
  },

  fetchMyLessons: async () => {
    try {
      const state = get();
      const lang = state.languageCode || 'de';
      const search = state.librarySearch;
      const urlBase = `/library/my-lessons?lang=${lang}&search=${encodeURIComponent(search)}`;
      // Fetch both tabs in parallel
      const [active, completed] = await Promise.all([
        apiClient(`${urlBase}&completed=false`),
        apiClient(`${urlBase}&completed=true`),
      ]);
      if (get().languageCode !== lang) return;
      set({ myLessons: active, completedLessons: completed });
    } catch (err) {
      console.error("Failed to fetch My Lessons", err);
    }
  },

  fetchContinueStudying: async () => {
    try {
      const state = get();
      const lang = state.languageCode || 'de';
      const data = await apiClient(`/library/continue-studying?lang=${lang}`);
      if (get().languageCode !== lang) return;
      set({ continueStudying: data || [] });
    } catch (err) {
      console.error("Failed to fetch Continue Studying", err);
    }
  },

  // Batches: marks any lesson with new_words_count = 0 as is_completed = true in DB,
  // then refetches both lesson lists
  checkAndUpdateCompletions: async () => {
    try {
      const state = get();
      const lang = state.languageCode || 'de';
      await apiClient('/library/check-completions', {
        method: 'POST',
        body: JSON.stringify({ lang }),
      });
      // Refetch both lists after update
      await get().fetchMyLessons();
    } catch (err) {
      console.error("Failed to check completions", err);
    }
  },

  setMyLessonsSubTab: (tab) => set({ myLessonsSubTab: tab }),
  setLibrarySidebarTab: (tab) => set({ librarySidebarTab: tab }),
  setLibrarySearch: (term) => set({ librarySearch: term }),
  toggleReaderMode: () => {
    const { readerMode, currentPage, columnMapping, tokens } = get();
    const newMode = readerMode === 'paragraph' ? 'sentence' : 'paragraph';

    let targetPage = 0;

    if (newMode === 'sentence') {
      // Switching Paragraph -> Sentence View:
      // Find sentencePageIndex of the first token on current paragraph page
      const currentTokenId = columnMapping[currentPage]?.[0];
      const token = tokens.find(t => t.id === currentTokenId);
      if (token && token.sentencePageIndex !== undefined) {
        targetPage = token.sentencePageIndex;
      }
    } else {
      // Switching Sentence -> Paragraph View:
      // Find token index of first valid word/text token in current sentence (skip newlines)
      const currentToken = tokens.find(t => t.sentencePageIndex === currentPage && !t.isNewline && t.text && t.text.trim().length > 0);
      if (currentToken) {
        const tokenIdx = tokens.findIndex(t => t.id === currentToken.id);
        if (tokenIdx !== -1) {
          set({ initialTokenIndex: tokenIdx });
        }
      }
    }

    localStorage.setItem('lingq_reader_mode', newMode);
    set({ readerMode: newMode, currentPage: targetPage });
  },

  fetchMyCoursesDropdown: async () => {
    try {
      const state = get();
      const lang = state.languageCode || 'de';
      const data = await apiClient(`/library/courses?lang=${lang}`);
      set({ myCoursesDropdown: data });
    } catch (err) { console.error(err); }
  },

  createCourse: async (title: string, level: string, description?: string, imageUrl?: string, isPublic?: boolean) => {
    try {
      const state = get();
      const lang = state.languageCode || 'de';
      const data = await apiClient('/library/courses', {
        method: 'POST',
        body: JSON.stringify({ title, level, languageCode: lang, description: description || '', imageUrl: imageUrl || '', isPublic: isPublic ?? false })
      });
      if (data.success) {
        set({ myCoursesDropdown: [...state.myCoursesDropdown, data.course] });
        return data.course;
      }
    } catch (err) { console.error(err); return null; }
  },

  importLesson: async (courseId: string, title: string, rawText: string, imageUrl?: string, description?: string, audioUrl?: string, isPublic?: boolean, audioDuration?: number, originalUrl?: string) => {
    try {
      const state = get();
      const lang = state.languageCode || 'de';
      const data = await apiClient('/lessons/parse', {
        method: 'POST',
        body: JSON.stringify({ courseId, title, rawText, languageCode: lang, imageUrl: imageUrl || '', description: description || '', audioUrl: audioUrl || '', isPublic: isPublic ?? false, audioDuration: audioDuration || 0, originalUrl: originalUrl || '' })
      });
      return data.lessonId;
    } catch (err) { console.error(err); return null; }
  },

  fetchHints: async (word: string) => {
    const { languageCode } = get();
    set({ isLoadingHints: true, activeWordHints: [] });
    try {
      const hints = await apiClient(`/vocab/hints?word=${word}&lang=${languageCode}`);
      set({ activeWordHints: hints, isLoadingHints: false });
    } catch (err) {
      set({ isLoadingHints: false });
      console.error(err);
    }
  },

  clearLessonSession: () => {
    set({ activeLessonId: null });
  },

  fetchLesson: async (lessonId: string) => {
    set({ isLoadingLesson: true, isLayoutReady: false });
    try {
      const data = await apiClient(`/lessons/${lessonId}`);
      const { tokens } = data as { tokens: Token[] };

      // --- CALCULATE SENTENCE PAGINATION (Syncs 1-to-1 with audio_timestamps) ---
      const rawTextForSentences = (data as { originalText?: string }).originalText || (tokens || []).map(t => t.text).join('');
      const tokensWithSentencePaging = assignSentencePageIndexToTokens(tokens || [], rawTextForSentences);

      const instances = buildPhraseInstances(tokensWithSentencePaging, data.phrases || []);

      set((state) => {
        // Prevent React 18 StrictMode double-mount leaks by preserving 
        // the session if we are re-fetching the same lesson.
        const isSameLesson = state.activeLessonId === lessonId;

        const tokenMap: Record<string, Token> = {};
        tokensWithSentencePaging.forEach(t => { tokenMap[t.id] = t; });

        const phraseMap: Record<string, Phrase> = {};
        instances.forEach(p => { phraseMap[p.id] = p; });

        return {
          activeLessonId: lessonId,
          activeLessonOwnerId: data.ownerId || null,
          courseId: data.courseId || null,
          courseTitle: data.courseTitle,
          courseLevel: data.courseLevel,
          lessonTitle: data.lessonTitle,
          lessonImg: data.lessonImg,
          lessonAudio: data.lessonAudio || null,
          lessonDuration: data.lessonDuration || 0,
          audioTimestamps: data.audioTimestamps || null,
          activeSentenceIndex: null,
          revealedSentenceIndices: isSameLesson ? state.revealedSentenceIndices : new Set<number>(),
          authorName: data.authorName || 'LingQ',
          readTimes: data.readTimes || 0,
          totalListenedSec: data.totalListenedSec || 0,
          tokens: tokensWithSentencePaging,
          tokenMap,
          dbPhrases: data.phrases || [],
          phrases: instances,
          phraseMap,
          languageCode: data.languageCode || 'en',
          isRTL: data.isRTL || false,
          totalCoins: data.totalCoins || 0,
          totalKnownWords: data.totalKnownWords || 0,
          playingSentenceIndex: null,
          isAudioPlaying: false,
          sentenceAudioTrigger: null,
          currentPage: 0,
          isLayoutReady: false,
          savedHighestTokenIndex: data.highestPageRead || 0,
          initialTokenIndex: data.highestPageRead || 0,
          selectedId: null,
          draftPhraseRange: null,
          showSummary: false,
          showModal: false,
          showLessonInfoModal: false,
          pageEnterTime: Date.now(),
          isLoadingLesson: false,
          prevLessonId: data.prevLessonId || null,
          nextLessonId: data.nextLessonId || null,
          originalText: (data as { originalText?: string }).originalText || '',
          lessonIndex: data.lessonIndex || 0,
          courseLessonsCount: data.courseLessonsCount || 0,
          // IF IT'S THE SAME LESSON, KEEP THE SESSION STATE. 
          // IF IT'S A NEW LESSON, RESET TO 0.
          readTokenIds: isSameLesson ? state.readTokenIds : new Set<string>(),
          sessionWordsRead: isSameLesson ? state.sessionWordsRead : 0,
          sessionListeningTicks: isSameLesson ? state.sessionListeningTicks : 0,
          sessionDailyLingqs: isSameLesson ? state.sessionDailyLingqs : 0,
          sessionDailyLingqsLearned: isSameLesson ? state.sessionDailyLingqsLearned : 0,
          lessonStructureHash: Date.now(),
        }
      });

      console.log('[ReaderStore:fetchLesson]', {
        lessonId,
        highestPageRead: data.highestPageRead,
        initialTokenIndex: data.highestPageRead || 0,
        tokensCount: tokensWithSentencePaging.length,
        isSameLesson: get().activeLessonId === lessonId
      });

      // We no longer manually call setPage here because ReaderPane will calculate the layout
      // and use initialTokenIndex to find the correct dynamic CSS column page on its first render!
      // This ensures responsiveness across devices and reader modes.
    } catch (err) {
      set({ isLoadingLesson: false });
      console.error("Failed to load lesson", err);
    }
  },

  fetchUserTags: async () => {
    try {
      const lang = get().languageCode || 'en';
      const data = await apiClient(`/vocab/tags?lang=${lang}`);
      set({ userTags: data });
    } catch (err) {
      console.error("Failed to fetch user tags", err);
    }
  },

  setPage: (page) => {
    set({
      currentPage: page,
      selectedId: null,
      draftPhraseRange: null,
      clickPos: null,
    });
  },

  setPagination: (totalPages, columnMapping, overridePage) => {
    // Clamp currentPage atomically in the same set() call — the same pattern used by
    // syncPageWithinSentence / setActiveSentenceIndex — so the page is always valid
    // the moment the new mapping is committed (no extra render cycle needed).
    const { currentPage } = get();
    const target = overridePage !== undefined ? overridePage : currentPage;
    const clampedPage = Math.max(0, Math.min(target, totalPages - 1));
    
    console.log('[ReaderStore:setPagination]', {
      totalPages,
      overridePage,
      previousCurrentPage: currentPage,
      clampedPage,
      pageMappingCounts: Object.fromEntries(
        Object.entries(columnMapping).map(([page, ids]) => [page, ids.length])
      )
    });

    set({ totalPages, columnMapping, currentPage: clampedPage });
  },

  markTokensAsRead: (tokenIds) => {
    const { readTokenIds, sessionWordsRead, updateDailyStats, tokens } = get();

    let newWordsAdded = 0;
    const newReadTokens = new Set(readTokenIds);

    tokenIds.forEach(id => {
      if (!newReadTokens.has(id)) {
        // Double check if token is learnable
        const t = tokens.find(tok => tok.id === id);
        if (t && t.isLearnable && !t.isNewline) {
          newReadTokens.add(id);
          newWordsAdded++;
        }
      }
    });

    console.log('[ReaderStore:markTokensAsRead]', {
      inputTokenIdsCount: tokenIds.length,
      newWordsAdded,
      sessionWordsReadBefore: sessionWordsRead,
      sessionWordsReadAfter: sessionWordsRead + newWordsAdded,
      totalReadTokenIdsCount: newReadTokens.size
    });

    if (newWordsAdded > 0) {
      updateDailyStats({ words: newWordsAdded });
      set({
        readTokenIds: newReadTokens,
        sessionWordsRead: sessionWordsRead + newWordsAdded
      });
    }
  },

  selectItem: (id) => set({ selectedId: id, draftPhraseRange: null, isSidebarVisible: true, showSettingsDrawer: false, showTranslation: false }),

  clearSelection: () => {
    set({ selectedId: null, draftPhraseRange: null, clickPos: null });
  },

  setModal: (show) => set({ showModal: show }),
  setShowLessonInfoModal: (show) => set({ showLessonInfoModal: show }),
  setShowSummary: (show) => set({ showSummary: show }),

  updateStage: async (payload: UpdatePayload) => {
    const { id, stage: newStage, meaning, meanings: payloadMeanings, tags: wordTags, notes } = payload;
    if (!id) return;

    const state = get();
    const isPhrase = id.includes('_');

    if (isPhrase) {
      const instance = state.phrases.find(p => p.id === id);
      if (!instance) return;
      const targetDbId = instance.dbId;

      const finalTags = wordTags !== undefined ? wordTags : (instance.word_tags || []);
      const formattedTagsStr = finalTags.length > 0 ? finalTags.join(',') : undefined;

      const newTagsCache = new Set(state.userTags);
      finalTags.forEach((t: string) => newTagsCache.add(t));

      const finalMeaning = meaning !== undefined ? meaning : instance.meaning;
      const finalMeanings = payloadMeanings !== undefined ? payloadMeanings : (instance.meanings || (finalMeaning ? [finalMeaning] : []));

      const updatedDbPhrases = state.dbPhrases.map(p =>
        p.id === targetDbId ? { ...p, stage: newStage, meaning: finalMeaning, meanings: finalMeanings, phrase_tags: formattedTagsStr, notes: notes !== undefined ? notes : p.notes } as DbPhrase : p
      );

      const newPhraseInstances = buildPhraseInstances(state.tokens, updatedDbPhrases);
      const newPhraseMap = { ...state.phraseMap };
      newPhraseInstances.forEach(p => { newPhraseMap[p.id] = p; });

      set({
        dbPhrases: updatedDbPhrases,
        phrases: newPhraseInstances,
        phraseMap: newPhraseMap,
        userTags: Array.from(newTagsCache)
      });

      try {
        await apiClient(`/phrases/${targetDbId}`, {
          method: 'PUT',
          body: JSON.stringify({ stage: newStage, user_meaning: finalMeaning, meaning: finalMeaning, meanings: finalMeanings, wordTags: finalTags, notes })
        });
      } catch (err) {
        console.error("Failed to update phrase", err);
      }

    } else {
      const tokenIndex = state.tokens.findIndex(t => t.id === id);
      if (tokenIndex === -1) return;

      const targetToken = state.tokens[tokenIndex];
      if (!targetToken || !targetToken.isLearnable) return;

      const finalTags = wordTags !== undefined ? wordTags : (targetToken.word_tags || []);
      const targetText = targetToken.text.toLowerCase();

      const coinValues: Record<number, number> = { 0: 0, 1: 5, 2: 7, 3: 9, 4: 11, 5: 15, 6: 0 };
      const oldStage = Number(targetToken.stage) || 0;

      let lingqDelta = 0;
      if (oldStage === 0 && (newStage >= 1 && newStage <= 4)) lingqDelta = 1;
      if ((oldStage >= 1 && oldStage <= 4) && newStage === 0) lingqDelta = -1;

      const knownDelta = (oldStage !== 5 && newStage === 5) ? 1 : ((oldStage === 5 && newStage !== 5) ? -1 : 0);

      let oldCoins = coinValues[oldStage] || 0;
      let newCoins = coinValues[newStage] || 0;

      let isIgnoredInitially = targetToken.isIgnoredInitially || false;

      if (oldStage === 0 && newStage === 6) {
        isIgnoredInitially = true;
      }

      if (isIgnoredInitially) {
        oldCoins = 0;
        newCoins = 0;
      }

      const coinDelta = newCoins - oldCoins;
      const newStatus = (newStage === 0 ? 'new' : (newStage === 5 ? 'known' : (newStage === 6 ? 'ignored' : 'learning'))) as Token['status'];
      const finalMeaning = meaning !== undefined ? meaning : targetToken.meaning;
      const finalMeanings = payloadMeanings !== undefined ? payloadMeanings : (targetToken.meanings || (finalMeaning ? [finalMeaning] : []));

      // Update daily stats optimistically
      get().updateDailyStats({ created: lingqDelta, learned: knownDelta });

      const newTokenMap = { ...state.tokenMap };
      const updatedTokens = state.tokens.map(t => {
        if (t.isLearnable && t.text.toLowerCase() === targetText) {
          const newT = {
            ...t,
            stage: newStage,
            status: newStatus,
            meaning: finalMeaning,
            meanings: finalMeanings,
            isIgnoredInitially,
            word_tags: finalTags,
            notes: notes !== undefined ? notes : t.notes
          };
          newTokenMap[t.id] = newT;
          return newT;
        }
        return t;
      });

      const newTagsCache = new Set(state.userTags);
      finalTags.forEach((t: string) => newTagsCache.add(t));

      set({
        tokens: updatedTokens as Token[],
        tokenMap: newTokenMap,
        userTags: Array.from(newTagsCache),
        totalCoins: Math.max(0, state.totalCoins + coinDelta),
        totalKnownWords: state.totalKnownWords + knownDelta,
      });

      const targetIndex = state.tokens.findIndex(t => t.id === targetToken.id);
      let relatedPhraseOccur: string | undefined = undefined;

      if (oldStage === 0 && newStage >= 1 && newStage <= 5) {
        // Use lesson's original_text for a richer context sentence, falling back to token window
        const fallback = () => {
          const startIdx = Math.max(0, targetIndex - 3);
          const endIdx = Math.min(state.tokens.length - 1, targetIndex + 3);
          return state.tokens.slice(startIdx, endIdx + 1)
            .map(t => t.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        };

        const originalText = state.originalText;
        if (originalText) {
          const lowerText = targetToken.text.toLowerCase();
          // Find the first occurrence of the word in originalText (word-boundary aware)
          const wordRegex = new RegExp(`\\b${lowerText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          const match = wordRegex.exec(originalText);
          if (match) {
            const matchIndex = match.index;
            const windowChars = 40;
            const start = Math.max(0, matchIndex - windowChars);
            const end = Math.min(originalText.length, matchIndex + match[0].length + windowChars);
            const snippet = originalText.slice(start, end).replace(/\s+/g, ' ').trim();
            relatedPhraseOccur = snippet;
          } else {
            relatedPhraseOccur = fallback();
          }
        } else {
          relatedPhraseOccur = fallback();
        }
      }

      try {
        await apiClient('/vocab/upsert', {
          method: 'POST',
          body: JSON.stringify({
            wordText: targetToken.text,
            stage: newStage,
            meaning: finalMeaning,
            meanings: finalMeanings,
            languageCode: state.languageCode,
            coinDelta: coinDelta,
            knownDelta: knownDelta,
            lingqDelta: lingqDelta,
            isIgnoredInitially: isIgnoredInitially,
            wordTags: finalTags,
            related_phrase_occur: relatedPhraseOccur,
            notes
          })
        });
      } catch (err) {
        console.error("Failed to sync vocab to server", err);
      }
    }
  },

  deleteLesson: async (lessonId: string) => {
    try {
      await apiClient(`/lessons/${lessonId}`, { method: 'DELETE' });

      // Remove from all local arrays
      set((state) => ({
        myLessons: state.myLessons.filter(l => l.id !== lessonId),
        completedLessons: state.completedLessons.filter(l => l.id !== lessonId),
        myCourses: state.myCourses.filter(l => l.id !== lessonId),
        continueStudying: state.continueStudying.filter(l => l.id !== lessonId),
        activeCourseDetails: state.activeCourseDetails
          ? {
            ...state.activeCourseDetails,
            course: {
              ...state.activeCourseDetails.course,
              lesson_count: Math.max(0, (state.activeCourseDetails.course.lesson_count || 1) - 1),
            },
            lessons: state.activeCourseDetails.lessons?.filter((l: Lesson) => l.id !== lessonId) || []
          }
          : null
      }));

      await get().fetchContinueStudying();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("Failed to delete lesson:", message);
      throw err;
    }
  },

  setDraftPhrase: (range) => set({ draftPhraseRange: range, selectedId: null, isSidebarVisible: true, showSettingsDrawer: false, showTranslation: false }),

  createPhrase: async (range, meaning) => {
    const state = get();

    const isCrissCross = state.phrases.some(p => {
      const touches = p.range.some((id: string) => range.includes(id));
      const completelyWraps = p.range.every((id: string) => range.includes(id));
      const completelyWrappedBy = range.every((id: string) => p.range.includes(id));
      return touches && !completelyWraps && !completelyWrappedBy;
    });

    if (isCrissCross) {
      alert("Phrases cannot partially overlap. Please select a larger or smaller phrase.");
      return;
    }

    let maxOverlap = 0;
    for (const tokenId of range) {
      const overlapCount = state.phrases.filter(p => p.range.includes(tokenId)).length;
      if (overlapCount > maxOverlap) maxOverlap = overlapCount;
    }
    if (maxOverlap >= 2) {
      alert("Maximum of 2 stacked phrases allowed.");
      return;
    }

    const phraseTokens = state.tokens.filter(t => range.includes(t.id));
    const wordTokensOnly = phraseTokens.filter(t => !t.isNewline && t.text.match(/\p{L}/u));

    if (wordTokensOnly.length === 0) return;

    const exactText = wordTokensOnly.map(t => t.text).join(' ');
    const firstWordId = wordTokensOnly[0].id;

    const startTokenIndex = state.tokens.findIndex(t => t.id === range[0]);
    const endTokenIndex = state.tokens.findIndex(t => t.id === range[range.length - 1]);
    let relatedPhraseOccur: string | undefined = undefined;

    if (startTokenIndex !== -1 && endTokenIndex !== -1) {
      const startIdx = Math.max(0, startTokenIndex - 3);
      const endIdx = Math.min(state.tokens.length - 1, endTokenIndex + 3);
      relatedPhraseOccur = state.tokens.slice(startIdx, endIdx + 1)
        .map(t => t.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Optimistic UI Update: Render phrase immediately in React state (0ms delay)
    const tempId = `temp_phrase_${Date.now()}`;
    const tempDbPhrase: DbPhrase = {
      id: tempId,
      phrase_text: exactText.toLowerCase(),
      meaning: meaning || '',
      user_meaning: meaning || '',
      stage: 1,
    };

    const optimisticDbPhrases = [...(state.dbPhrases || []), tempDbPhrase];
    const optimisticPhraseInstances = buildPhraseInstances(state.tokens, optimisticDbPhrases);
    const optimisticSelectedInstance = optimisticPhraseInstances.find(p =>
      p.dbId === tempId && p.range.includes(firstWordId)
    );
    const optimisticPhraseMap = { ...state.phraseMap };
    optimisticPhraseInstances.forEach(p => { optimisticPhraseMap[p.id] = p; });

    set({
      dbPhrases: optimisticDbPhrases,
      phrases: optimisticPhraseInstances,
      phraseMap: optimisticPhraseMap,
      draftPhraseRange: null,
      selectedId: optimisticSelectedInstance ? optimisticSelectedInstance.id : null,
      totalCoins: state.totalCoins + 5,
      lessonStructureHash: Date.now(),
    });

    get().updateDailyStats({ created: 1 });

    // Background Async API Sync
    try {
      const res = await apiClient('/phrases', {
        method: 'POST',
        body: JSON.stringify({
          phrase_text: exactText,
          meaning: meaning,
          user_meaning: meaning,
          language_code: state.languageCode,
          related_phrase_occur: relatedPhraseOccur,
          notes: meaning ? "" : undefined
        })
      });

      if (res.phrase && res.phrase.id) {
        // Swap temp phrase with real DB phrase
        const currentDbPhrases = get().dbPhrases.map(p => p.id === tempId ? res.phrase : p);
        const finalPhraseInstances = buildPhraseInstances(get().tokens, currentDbPhrases);
        const finalSelectedInstance = finalPhraseInstances.find(p =>
          p.dbId === res.phrase.id && p.range.includes(firstWordId)
        );
        const finalPhraseMap: Record<string, Phrase> = {};
        finalPhraseInstances.forEach(p => { finalPhraseMap[p.id] = p; });

        set(s => ({
          dbPhrases: currentDbPhrases,
          phrases: finalPhraseInstances,
          phraseMap: finalPhraseMap,
          selectedId: s.selectedId?.startsWith(tempId) ? (finalSelectedInstance?.id || s.selectedId) : s.selectedId,
          lessonStructureHash: Date.now(),
        }));
      }
    } catch (err) {
      console.error("Failed to save phrase to server", err);
      // Revert optimistic update on error
      const revertedDbPhrases = get().dbPhrases.filter(p => p.id !== tempId);
      const revertedInstances = buildPhraseInstances(get().tokens, revertedDbPhrases);
      const revertedMap: Record<string, Phrase> = {};
      revertedInstances.forEach(p => { revertedMap[p.id] = p; });

      set(s => ({
        dbPhrases: revertedDbPhrases,
        phrases: revertedInstances,
        phraseMap: revertedMap,
        totalCoins: Math.max(0, s.totalCoins - 5),
        selectedId: s.selectedId?.startsWith(tempId) ? null : s.selectedId,
        lessonStructureHash: Date.now(),
      }));
    }
  },

  syncLessonProgress: async (lessonId, isCompleted, incrementReadTime, triggerRecalculateStats) => {
    const {
      tokens,
      currentPage,
      activeLessonId,
      isLayoutReady,
      sessionListeningTicks,
      sessionWordsRead,
      sessionDailyLingqs,
      sessionDailyLingqsLearned
    } = get();

    if (tokens.length === 0) return;
    const targetId = lessonId || activeLessonId;
    if (!targetId) return;

    if (!isLayoutReady && !isCompleted) return;

    const { columnMapping, readerMode, savedHighestTokenIndex } = get();
    let highestTokenIndex = savedHighestTokenIndex || 0;

    if (readerMode === 'sentence') {
      const firstTokenInSentence = tokens.find(t => t.sentencePageIndex === currentPage && !t.isNewline && t.text && t.text.trim());
      if (firstTokenInSentence) {
        const idx = tokens.findIndex(t => t.id === firstTokenInSentence.id);
        if (idx !== -1) {
          highestTokenIndex = idx;
          set({ savedHighestTokenIndex: idx });
        }
      }
    } else {
      const tokensOnPage = columnMapping[currentPage];
      if (tokensOnPage && tokensOnPage.length > 0) {
        const idx = tokens.findIndex(t => t.id === tokensOnPage[0]);
        if (idx !== -1) {
          highestTokenIndex = idx;
          set({ savedHighestTokenIndex: idx });
        }
      }
    }

    console.log('[ReaderStore:syncLessonProgress]', {
      lessonIdPassed: lessonId,
      targetId,
      currentPage,
      highestTokenIndexCalculated: highestTokenIndex,
      isCompleted,
      sessionWordsRead,
      sessionListeningTicks,
      readerMode,
      tokensOnCurrentPageCount: columnMapping[currentPage]?.length || 0
    });

    const learnableTokens = tokens.filter(t => t.isLearnable && !t.isNewline);
    const newWordsCount = new Set(learnableTokens.filter(t => (t.stage ?? 0) === 0).map(t => t.text.toLowerCase())).size;
    const lingqsCount = new Set(learnableTokens.filter(t => (t.stage ?? 0) >= 1 && (t.stage ?? 0) <= 4).map(w => w.text.toLowerCase())).size;
    const knownWordsCount = new Set(learnableTokens.filter(t => (t.stage ?? 0) === 5).map(w => w.text.toLowerCase())).size;

    try {
      await apiClient(`/lessons/${targetId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({
          newWordsCount,
          lingqsCount,
          knownWordsCount,
          highestPageRead: highestTokenIndex,
          isCompleted,
          listeningSec: sessionListeningTicks,
          wordsRead: sessionWordsRead,
          lingqsCreatedDelta: sessionDailyLingqs,
          lingqsLearnedDelta: sessionDailyLingqsLearned,
          incrementReadTime: incrementReadTime || false
        })
      });

      // 1. Session variables are ALREADY optimistically accrued into `totalDaily...` by `updateDailyStats` dynamically!
      // Therefore, we solely evaluate streaks off the immediate state and zero out the session payload blocks strictly.
      const currentLoc = get();

      const tier = getTier(currentLoc.dailyGoalTier);
      const isFulfilled = (currentLoc.totalDailyLingqs >= tier.lingqGoal) &&
        (currentLoc.totalDailyListeningSec >= (tier.listenMinGoal * 60));

      set({
        hasFulfilledToday: currentLoc.hasFulfilledToday || isFulfilled,
        totalStreaks: (currentLoc.hasFulfilledToday === false && isFulfilled === true) ? currentLoc.totalStreaks + 1 : currentLoc.totalStreaks,

        readTimes: currentLoc.readTimes + sessionWordsRead,
        totalListenedSec: currentLoc.totalListenedSec + sessionListeningTicks,

        sessionListeningTicks: currentLoc.sessionListeningTicks - sessionListeningTicks,
        sessionWordsRead: currentLoc.sessionWordsRead - sessionWordsRead,
        sessionDailyLingqs: currentLoc.sessionDailyLingqs - sessionDailyLingqs,
        sessionDailyLingqsLearned: currentLoc.sessionDailyLingqsLearned - sessionDailyLingqsLearned
      });

      if (triggerRecalculateStats) {
        await get().recalculateStats();
      }
    } catch (err) {
      console.error("Failed to sync progress", err);
    }
  },

  handlePageAdvance: (newPage: number) => {
    get().setPage(newPage);
    const { columnMapping, tokens, readerMode, activeLessonId, syncLessonProgress } = get();

    let tokenIdx = -1;
    if (readerMode === 'sentence') {
      const firstTokenInSentence = tokens.find(t => t.sentencePageIndex === newPage && !t.isNewline && t.text && t.text.trim());
      if (firstTokenInSentence) {
        tokenIdx = tokens.findIndex(t => t.id === firstTokenInSentence.id);
      }
    } else {
      const tokensOnPage = columnMapping[newPage];
      if (tokensOnPage && tokensOnPage.length > 0) {
        tokenIdx = tokens.findIndex(t => t.id === tokensOnPage[0]);
      }
    }

    if (tokenIdx !== -1) {
      set({ savedHighestTokenIndex: tokenIdx });
    }

    // Debounced background auto-save: saves progress 2s after resting on a page
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      if (activeLessonId) {
        syncLessonProgress(activeLessonId);
      }
    }, 2000);
  },

  getPageForToken: (tokenId: string) => {
    const { columnMapping } = get();
    for (const [page, ids] of Object.entries(columnMapping)) {
      if (ids.includes(tokenId)) {
        return parseInt(page);
      }
    }
    return 0; // Default fallback
  },

  goToEdgePage: (edge) => {
    const { totalPages } = get();
    const targetPage = edge === 'first' ? 0 : Math.max(0, totalPages - 1);
    get().handlePageAdvance(targetPage);
  },

  navigateWord: (direction, onlyBlue) => {
    const { tokens, selectedId, currentPage, columnMapping, getPageForToken } = get();

    let currentIndex = tokens.findIndex(w => w.id === selectedId);
    if (currentIndex === -1) {
      const idsOnPage = columnMapping[currentPage] || [];
      if (idsOnPage.length > 0) {
        currentIndex = tokens.findIndex(w => w.id === idsOnPage[0]) - 1;
      } else {
        currentIndex = -1;
      }
    }

    const searchArr = direction === 'next'
      ? tokens.slice(currentIndex + 1)
      : tokens.slice(0, Math.max(0, currentIndex)).reverse();

    const target = searchArr.find(w => w.isLearnable && (!onlyBlue || w.stage === 0));

    if (target) {
      get().handlePageAdvance(getPageForToken(target.id));
      set({ selectedId: target.id });
    }
  },

  completeLesson: async () => {
    const state = get();

    const remainingBlueTokens = state.tokens.filter(t => t.isLearnable && (t.stage ?? 0) === 0);

    if (remainingBlueTokens.length === 0) {
      set({ showSummary: true, showModal: false });
      return;
    }

    const uniqueBlueTexts = Array.from(
      new Set(remainingBlueTokens.map(t => t.text.toLowerCase()))
    );

    const coinDelta = uniqueBlueTexts.length * 15;
    const knownDelta = uniqueBlueTexts.length;

    const updatedTokenMap = { ...state.tokenMap };
    const updatedTokens = state.tokens.map(t => {
      if (t.isLearnable && (t.stage ?? 0) === 0) {
        const updated = { ...t, stage: 5, status: 'known' as const };
        if (updatedTokenMap[t.id]) {
          updatedTokenMap[t.id] = updated;
        }
        return updated;
      }
      return t;
    });

    set((state) => ({
      tokens: updatedTokens,
      tokenMap: updatedTokenMap,
      totalCoins: state.totalCoins + coinDelta,
      totalKnownWords: state.totalKnownWords + knownDelta,
      showSummary: true,
      showModal: false,
      selectedId: null,
      draftPhraseRange: null
    }));

    // Optimistically update daily stats for mastered words
    get().updateDailyStats({ learned: knownDelta });

    const batchPayloads = uniqueBlueTexts.map(text => {
      const sampleTokenIndex = state.tokens.findIndex(t => t.isLearnable && t.text.toLowerCase() === text);
      let context = null;
      if (sampleTokenIndex !== -1) {
        const startIdx = Math.max(0, sampleTokenIndex - 3);
        const endIdx = Math.min(state.tokens.length - 1, sampleTokenIndex + 3);
        context = state.tokens.slice(startIdx, endIdx + 1).map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
      }
      return { word: text, context };
    });

    try {
      await apiClient('/vocab/batch-upsert', {
        method: 'POST',
        body: JSON.stringify({
          words: batchPayloads,
          stage: 5,
          languageCode: state.languageCode,
          coinDeltaTotal: coinDelta,
          knownDeltaTotal: knownDelta
        })
      });

      if (state.activeLessonId) {
        get().syncLessonProgress(state.activeLessonId, true, true);
      }
    } catch (err) {
      console.error("Failed to sync complete lesson", err);
    }
  },

  navigatePhrase: (direction) => {
    const { phrases, tokens, selectedId, currentPage, getPageForToken } = get();
    if (phrases.length === 0) return;

    const currentIndex = phrases.findIndex(p => p.id === selectedId);

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= phrases.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = phrases.length - 1;

    const targetPhrase = phrases[nextIndex];

    const firstTokenId = targetPhrase.range[0];
    const targetToken = tokens.find(t => t.id === firstTokenId);

    if (targetToken) {
      const targetPage = getPageForToken(targetToken.id);
      if (targetPage !== currentPage) {
        get().handlePageAdvance(targetPage);
      }
      set({
        selectedId: targetPhrase.id,
        draftPhraseRange: null
      });
    } else {
      set({ selectedId: targetPhrase.id, draftPhraseRange: null });
    }
  },

  syncTokenStage: (text: string, newStage: number, meaning?: string, notes?: string) => {
    const newStatus = newStage === 0 ? 'new' : (newStage === 5 ? 'known' : (newStage === 6 ? 'ignored' : 'learning'));
    set(state => ({
      tokens: state.tokens.map(t => {
        if (t.text.toLowerCase() === text.toLowerCase()) {
          return { ...t, stage: newStage, status: newStatus, meaning: meaning !== undefined ? meaning : t.meaning, notes: notes !== undefined ? notes : t.notes };
        }
        return t;
      })
    }));
  },

  syncPhraseStage: (phraseId: string, newStage: number, meaning?: string, notes?: string) => {
    set(state => {
      if (!state.dbPhrases) return state;
      const updatedDbPhrases = state.dbPhrases.map(p => {
        if (p.id === phraseId) {
          return { ...p, stage: newStage, meaning: meaning !== undefined ? meaning : p.meaning, notes: notes !== undefined ? notes : p.notes } as DbPhrase;
        }
        return p;
      });
      return {
        dbPhrases: updatedDbPhrases,
        phrases: buildPhraseInstances(state.tokens, updatedDbPhrases)
      };
    });
  },

  fetchLingqRecommendedCourses: async (apiKey) => {
    try {
      const { languageCode } = get();
      const token = localStorage.getItem('lingq_token');

      const queryParams = new URLSearchParams({ lang: languageCode });
      if (apiKey) queryParams.append('apiKey', apiKey);

      const response = await fetch(`${BASE_URL}/library/lingq-courses?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) throw new Error("Failed to fetch LingQ recommended courses");

      const data = await response.json();
      return data.results || [];
    } catch (err: unknown) {
      console.error("fetchLingqRecommendedCourses Error:", err);
      throw err;
    }
  },

  fetchLingqCourseLessons: async (courseId, apiKey) => {
    try {
      const { languageCode } = get();
      const token = localStorage.getItem('lingq_token');

      const queryParams = new URLSearchParams({ lang: languageCode, courseId: String(courseId) });
      if (apiKey) queryParams.append('apiKey', apiKey);

      const response = await fetch(`${BASE_URL}/library/lingq-lessons?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) throw new Error("Failed to fetch LingQ course lessons");

      const data = await response.json();
      return data;
    } catch (err: unknown) {
      console.error("fetchLingqCourseLessons Error:", err);
      throw err;
    }
  },

  fetchLingqImportedIds: async () => {
    try {
      const { languageCode } = get();
      const response = await fetch(`${BASE_URL}/library/lingq-imported-ids?lang=${languageCode}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('lingq_token') || ''}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch imported LingQ IDs');
      return await response.json();
    } catch (error) {
      console.error("fetchLingqImportedIds error:", error);
      return { importedIds: [], importedToday: 0, maxQuota: 10 };
    }
  },

  importFromLingq: async (apiKey, selectedLessons) => {
    try {
      const { languageCode } = get();
      const token = localStorage.getItem('lingq_token');

      const response = await fetch(`${BASE_URL}/library/lingq-import-selected`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ apiKey, languageCode, selectedLessons })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import selected lessons.");
      }

      const result = await response.json();

      if (result.success) {
        // Refresh library stats/feed
        get().fetchLibrary();
      }
      return result;
    } catch (err: unknown) {
      console.error("LingQ Import Action Error:", err);
      throw err;
    }
  },

  deleteCourse: async (courseId: string, confirm = false) => {
    try {
      const resp = await apiClient(`/library/courses/${courseId}${confirm ? '?confirm=true' : ''}`, { method: 'DELETE' });

      if (resp.error === 'confirm_required') {
        return { success: false, error: 'confirm_required', message: resp.message };
      }

      // Update local state
      set(s => ({
        myCourses: s.myCourses.filter(c => c.id !== courseId),
        guidedCourses: s.guidedCourses.filter(c => c.id !== courseId),
        continueStudying: s.continueStudying.filter(l => l.course_id !== courseId)
      }));

      await get().fetchContinueStudying();

      return { success: true };
    } catch (err: unknown) {
      // In this repo, apiClient throws 'Error' with the string from the backend's .error field
      if (err instanceof Error && err.message === 'confirm_required') {
        return {
          success: false,
          error: 'confirm_required',
          message: "This course contains lessons. Deleting it will permanently remove all of them."
        };
      }
      const message = err instanceof Error ? err.message : String(err);
      console.warn("Delete course failed:", message);
      throw err;
    }
  },

  resetCompletion: () => set({ showSummary: false }),

  isLayoutReady: false,
  setIsLayoutReady: (ready) => set({ isLayoutReady: ready }),
}));

