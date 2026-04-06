// frontend/src/store/useReaderStore.ts
import { create } from 'zustand';
import { apiClient } from '../api/client'; // Your fetch wrapper
import { buildPhraseInstances } from '../utils/phraseMatcher';
import { getTier } from '../constants/tiers';
import type { Token, Phrase, DbPhrase, Lesson, Course, CourseDetail, UpdatePayload, WordHint, UserStats } from '../types/reader';

interface SupportedLanguage {
  code: string;
  name: string;
  isRTL: boolean;
}

interface ReaderState {
  currentUsername: string;

  courseTitle: string;
  courseLevel: string | null;
  lessonTitle: string;
  lessonImg: string;
  lessonAudio: string | null;

  guidedCourses: Course[];
  activeCourseDetails: CourseDetail | null; 
  activeLessonId: string | null;


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
  dbPhrases: DbPhrase[]; // Stores raw phrases from DB (could be refined further if needed)
  phrases: Phrase[];   // Calculated instances mapping over tokens
  languageCode: string;
  availableLanguages: SupportedLanguage[];

  userTags: string[];

  currentPage: number;
  selectedId: string | null;
  draftPhraseRange: string[] | null;

  totalCoins: number;
  totalKnownWords: number;
  totalStreaks: number;
  totalDailyLingqs: number;
  totalDailyLingqsLearned: number;
  totalDailyListeningSec: number;
  totalDailyWordsRead: number;
  last7DaysStats: UserStats;
  last30DaysStats: UserStats;
  dailyGoalTier: string;

  sessionListeningTicks: number;

  showSummary: boolean;
  showModal: boolean;
  isRTL: boolean;
  hasFulfilledToday: boolean;
  hasImportedFromLingq: boolean;
  isLoadingLesson: boolean;

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
  fetchContinueStudying: () => Promise<void>;
  checkAndUpdateCompletions: () => Promise<void>;

  setMyLessonsSubTab: (tab: 'continue' | 'completed') => void;
  setLibrarySidebarTab: (tab: 'lesson-feed' | 'guided-course') => void;

  fetchMyCoursesDropdown: () => Promise<void>;
  createCourse: (title: string, level: string, description?: string, imageUrl?: string, isPublic?: boolean) => Promise<Course | undefined>;
  importLesson: (courseId: string, title: string, rawText: string, imageUrl?: string, description?: string, audioUrl?: string, isPublic?: boolean, audioDuration?: number) => Promise<string | null>;
  importFromLingq: (apiKey: string, courseCount: number, lessonsPerCourse: number) => Promise<{ success: boolean; count: number }>;


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
  completeLesson: () => void;
  setShowSummary: (show: boolean) => void;
  resetCompletion: () => void;

  syncLessonProgress: (lessonId: string, isCompleted?: boolean, incrementReadTime?: boolean) => Promise<void>;

  // Navigation helpers
  navigateWord: (direction: 'next' | 'prev', onlyBlue: boolean) => void;
  navigatePhrase: (direction: 'next' | 'prev') => void;
  goToEdgePage: (edge: 'first' | 'last') => void;

  // Reading-session trackers
  sessionWordsRead: number;
  sessionReadPages: Set<number>;
  sessionDailyLingqs: number;
  sessionDailyLingqsLearned: number;
  pageEnterTime: number;
  handlePageAdvance: (newPage: number) => void;
  ticksSinceLastSync: number;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  currentUsername: "",

  courseTitle: "",
  courseLevel: "",
  lessonTitle: "",
  lessonImg: "",
  lessonAudio: null,

  guidedCourses: [],
  activeCourseDetails: null,
  activeLessonId: null,

  myCourses: [],
  myCoursesDropdown: [],
  myLessons: [],
  completedLessons: [],
  continueStudying: [],
  myLessonsSubTab: 'continue',
  librarySidebarTab: 'lesson-feed',

  activeWordHints: [],
  isLoadingHints: false,

  tokens: [],
  dbPhrases: [],
  phrases: [],
  languageCode: '',
  availableLanguages: [],

  userTags: [],

  currentPage: 0,
  selectedId: null,
  draftPhraseRange: null,

  totalCoins: 0,
  totalKnownWords: 0,
  totalStreaks: 0,
  totalDailyLingqs: 0,
  totalDailyLingqsLearned: 0,
  totalDailyListeningSec: 0,
  totalDailyWordsRead: 0,
  last7DaysStats: { created: 0, learned: 0, listening: 0, words: 0 },
  last30DaysStats: { created: 0, learned: 0, listening: 0, words: 0 },
  dailyGoalTier: 'calm',

  sessionListeningTicks: 0,

  sessionWordsRead: 0,
  sessionReadPages: new Set<number>(),
  sessionDailyLingqs: 0,
  sessionDailyLingqsLearned: 0,
  pageEnterTime: Date.now(),
  ticksSinceLastSync: 0,

  showSummary: false,
  showModal: false,
  isRTL: false,

  hasFulfilledToday: false,
  hasImportedFromLingq: false,
  isLoadingLesson: false,


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
      const state = get();
      const userId = localStorage.getItem('lingq_user');
      if (!userId) return;

      // Update backend preference
      await apiClient('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ targetLanguage: code })
      });

      // Update local state
      set({ languageCode: code });

      // Re-initialize for new language
      await state.initializeUserState(userId, code);

      console.log(`Switched to language: ${code}`);
    } catch (err) {
      console.error("Failed to switch language", err);
    }
  },

  syncLanguageWithUrl: async (code: string) => {
    const state = get();
    if (state.languageCode === code) return;

    console.log(`Syncing store language with URL: ${code}`);
    set({ languageCode: code });

    const userId = localStorage.getItem('lingq_user');
    if (userId) {
      await state.initializeUserState(userId, code);
    }
  },

  initializeUserState: async (id: string, lang?: string) => {
    try {
      const endpoint = lang ? `/auth/info/${id}?lang=${lang}` : `/auth/info/${id}`;
      const initUserData = await apiClient(endpoint);
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
        last7DaysStats: initUserData.stats7d || { created: 0, learned: 0, listening: 0, words: 0 },
        last30DaysStats: initUserData.stats30d || { created: 0, learned: 0, listening: 0, words: 0 },
        dailyGoalTier: initUserData.dailyGoalTier || 'calm',
        hasFulfilledToday: (initUserData.totalDailyLingqs >= getTier(initUserData.dailyGoalTier).lingqGoal) &&
          (initUserData.totalDailyListeningSec >= getTier(initUserData.dailyGoalTier).listenMinGoal * 60)
      });

    } catch (err) {
      console.error(err);
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
        last7DaysStats: {
          created: state.last7DaysStats.created + created,
          learned: state.last7DaysStats.learned + learned,
          listening: state.last7DaysStats.listening + listening,
          words: state.last7DaysStats.words + words,
        },
        last30DaysStats: {
          created: state.last30DaysStats.created + created,
          learned: state.last30DaysStats.learned + learned,
          listening: state.last30DaysStats.listening + listening,
          words: state.last30DaysStats.words + words,
        }
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

      if (response.success) {
        set({
          totalCoins: response.trueCoins,
          totalKnownWords: response.trueKnown,
        });
        console.log("✅ Stats Recalculated:", response);
      }
    } catch (err) {
      console.error("Failed to recalculate stats", err);
    }
  },

  fetchGuidedCourses: async () => {
    try {
      const lang = get().languageCode || 'de';
      const data = await apiClient(`/library/guided-courses?lang=${lang}`);
      set({ guidedCourses: data });
    } catch (err) { console.error(err); }
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
      const data = await apiClient(`/library/feed/${lang}`);
      if (data) {
        set({ myCourses: data });
      }
    } catch (err) {
      console.error(err);
    }
  },

  fetchMyLessons: async () => {
    try {
      const state = get();
      const lang = state.languageCode || 'de';
      // Fetch both tabs in parallel
      const [active, completed] = await Promise.all([
        apiClient(`/library/my-lessons?lang=${lang}&completed=false`),
        apiClient(`/library/my-lessons?lang=${lang}&completed=true`),
      ]);
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

  importLesson: async (courseId: string, title: string, rawText: string, imageUrl?: string, description?: string, audioUrl?: string, isPublic?: boolean, audioDuration?: number) => {
    try {
      const state = get();
      const lang = state.languageCode || 'de';
      const data = await apiClient('/lessons/parse', {
        method: 'POST',
        body: JSON.stringify({ courseId, title, rawText, languageCode: lang, imageUrl: imageUrl || '', description: description || '', audioUrl: audioUrl || '', isPublic: isPublic ?? false, audioDuration: audioDuration || 0 })
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

  fetchLesson: async (lessonId: string) => {
    set({ isLoadingLesson: true });
    try {
      const data = await apiClient(`/lessons/${lessonId}`);

      const instances = buildPhraseInstances(data.tokens, data.phrases || []);

      set((state) => {
        // Prevent React 18 StrictMode double-mount leaks by preserving 
        // the session if we are re-fetching the same lesson.
        const isSameLesson = state.activeLessonId === lessonId;

        return {
          activeLessonId: lessonId,
          courseTitle: data.courseTitle,
          courseLevel: data.courseLevel,
          lessonTitle: data.lessonTitle,
          lessonImg: data.lessonImg,
          lessonAudio: data.lessonAudio || null,
          tokens: data.tokens,
          dbPhrases: data.phrases || [],
          phrases: instances,
          languageCode: data.languageCode || 'en',
          isRTL: data.isRTL || false,
          totalCoins: data.totalCoins || 0,
          totalKnownWords: data.totalKnownWords || 0,
          currentPage: data.highestPageRead || 0,
          selectedId: null,
          draftPhraseRange: null,
          showSummary: false,
          showModal: false,
          pageEnterTime: Date.now(),
          isLoadingLesson: false,
          // IF IT'S THE SAME LESSON, KEEP THE SESSION STATE. 
          // IF IT'S A NEW LESSON, RESET TO 0.
          sessionReadPages: isSameLesson ? state.sessionReadPages : new Set<number>(),
          sessionWordsRead: isSameLesson ? state.sessionWordsRead : 0,
          sessionListeningTicks: isSameLesson ? state.sessionListeningTicks : 0,
          sessionDailyLingqs: isSameLesson ? state.sessionDailyLingqs : 0,
          sessionDailyLingqsLearned: isSameLesson ? state.sessionDailyLingqsLearned : 0,
        }
      });

      // If it's a double-mount, setPage's internal check (!newReadPages.has(page)) 
      // will see that page 0 is already in the Set and won't add the words again.
      get().setPage(data.highestPageRead || 0);
    } catch (err) {
      set({ isLoadingLesson: false });
      console.error("Failed to load lesson", err);
    }
  },

  fetchUserTags: async () => {
    try {
      const lang = get().languageCode || 'de';
      const data = await apiClient(`/vocab/tags?lang=${lang}`);
      set({ userTags: data });
    } catch (err) { console.error(err); }
  },

  setPage: (page) => {
    const { tokens, sessionReadPages, sessionWordsRead, updateDailyStats } = get();

    let newSessionWordsRead = sessionWordsRead;
    const newReadPages = new Set(sessionReadPages);

    if (!newReadPages.has(page)) {
      const pageLearnableWords = tokens.filter(
        t => t.pageIndex === page && t.isLearnable && !t.isNewline
      );
      newSessionWordsRead += pageLearnableWords.length;
      newReadPages.add(page);
      updateDailyStats({ words: pageLearnableWords.length });
    }

    set({
      currentPage: page,
      selectedId: null,
      draftPhraseRange: null,
      sessionWordsRead: newSessionWordsRead,
      sessionReadPages: newReadPages,
    });
  },

  selectItem: (id) => set({ selectedId: id, draftPhraseRange: null }),

  clearSelection: () => set({ selectedId: null, draftPhraseRange: null }),

  setModal: (show) => set({ showModal: show }),
  setShowSummary: (show) => set({ showSummary: show }),

  updateStage: async (payload: UpdatePayload) => {
    const { id, stage: newStage, meaning, tags: wordTags, notes } = payload;
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

      const updatedDbPhrases = state.dbPhrases.map(p =>
        p.id === targetDbId ? { ...p, stage: newStage, meaning: meaning !== undefined ? meaning : p.meaning, phrase_tags: formattedTagsStr, notes: notes !== undefined ? notes : p.notes } as DbPhrase : p
      );

      set({
        dbPhrases: updatedDbPhrases,
        phrases: buildPhraseInstances(state.tokens, updatedDbPhrases),
        userTags: Array.from(newTagsCache)
      });

      try {
        await apiClient(`/phrases/${targetDbId}`, {
          method: 'PUT',
          body: JSON.stringify({ stage: newStage, user_meaning: meaning, meaning: meaning, wordTags: finalTags, notes })
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

      // Update daily stats optimistically
      get().updateDailyStats({ created: lingqDelta, learned: knownDelta });

      const updatedTokens = state.tokens.map(t => {
        if (t.isLearnable && t.text.toLowerCase() === targetText) {
          return {
            ...t,
            stage: newStage,
            status: newStatus,
            meaning: finalMeaning,
            isIgnoredInitially,
            word_tags: finalTags,
            notes: notes !== undefined ? notes : t.notes
          };
        }
        return t;
      });

      const newTagsCache = new Set(state.userTags);
      finalTags.forEach((t: string) => newTagsCache.add(t));

      set({
        tokens: updatedTokens as Token[], userTags: Array.from(newTagsCache),
        totalCoins: Math.max(0, state.totalCoins + coinDelta),
        totalKnownWords: state.totalKnownWords + knownDelta,
      });

      const targetIndex = state.tokens.findIndex(t => t.id === targetToken.id);
      let relatedPhraseOccur: string | undefined = undefined;

      if (oldStage === 0 && newStage >= 1 && newStage <= 5) {
        const startIdx = Math.max(0, targetIndex - 3);
        const endIdx = Math.min(state.tokens.length - 1, targetIndex + 3);
        relatedPhraseOccur = state.tokens.slice(startIdx, endIdx + 1)
          .map(t => t.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      try {
        await apiClient('/vocab/upsert', {
          method: 'POST',
          body: JSON.stringify({
            wordText: targetToken.text,
            stage: newStage,
            meaning: finalMeaning,
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
        activeCourseDetails: state.activeCourseDetails
          ? {
            ...state.activeCourseDetails,
            lessons: state.activeCourseDetails.lessons?.filter((l: Lesson) => l.id !== lessonId) || []
          }
          : null
      }));
    } catch (err) {
      console.error("Failed to delete lesson", err);
      throw err;
    }
  },

  setDraftPhrase: (range) => set({ draftPhraseRange: range, selectedId: null }),

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

    try {
      const res = await apiClient('/phrases', {
        method: 'POST',
        body: JSON.stringify({
          phrase_text: exactText,
          meaning: meaning,
          user_meaning: meaning, // Keep for API compatibility
          language_code: state.languageCode,
          related_phrase_occur: relatedPhraseOccur,
          notes: meaning ? "" : undefined // Optional: ensure notes field is initialized if needed
        })
      });

      if (!res.phrase || !res.phrase.id) {
        return;
      }

      const updatedDbPhrases = [...(state.dbPhrases || []), res.phrase];
      const newPhraseInstances = buildPhraseInstances(state.tokens, updatedDbPhrases);

      const selectedInstance = newPhraseInstances.find(p =>
        p.dbId === res.phrase.id && p.range.includes(firstWordId)
      );

      set({
        dbPhrases: updatedDbPhrases,
        phrases: newPhraseInstances,
        draftPhraseRange: null,
        selectedId: selectedInstance ? selectedInstance.id : null,
        totalCoins: state.totalCoins + 5
      });

      // Increment daily LingQ count for the new phrase
      get().updateDailyStats({ created: 1 });

    } catch (err) {
      console.error("Failed to save phrase", err);
      set({ draftPhraseRange: null });
    }
  },

  syncLessonProgress: async (lessonId: string, isCompleted?: boolean, incrementReadTime?: boolean) => {
    const {
      tokens,
      currentPage,
      activeLessonId,
      sessionListeningTicks,
      sessionWordsRead,
      sessionDailyLingqs,
      sessionDailyLingqsLearned
    } = get();

    if (tokens.length === 0) return;
    const targetId = lessonId || activeLessonId;
    if (!targetId) return;

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
          highestPageRead: currentPage,
          isCompleted,
          listeningSec: sessionListeningTicks,
          wordsRead: sessionWordsRead,
          lingqsCreatedDelta: sessionDailyLingqs,
          lingqsLearnedDelta: sessionDailyLingqsLearned,
          incrementReadTime: incrementReadTime || false
        })
      });

      // Clear session accumulations AFTER successful sync to DB
      set({
        sessionListeningTicks: 0,
        sessionWordsRead: 0,
        sessionDailyLingqs: 0,
        sessionDailyLingqsLearned: 0
      });
    } catch (err) {
      console.error("Failed to sync progress", err);
    }
  },

  handlePageAdvance: (newPage: number) => {
    get().setPage(newPage);
  },

  goToEdgePage: (edge) => {
    const { tokens } = get();
    const targetPage = edge === 'first' ? 0 : Math.max(...tokens.map(w => w.pageIndex));
    get().setPage(targetPage);
  },

  navigateWord: (direction, onlyBlue) => {
    const { tokens, selectedId, currentPage } = get();

    let currentIndex = tokens.findIndex(w => w.id === selectedId);
    if (currentIndex === -1) {
      currentIndex = tokens.findIndex(w => w.pageIndex === currentPage) - 1;
    }

    const searchArr = direction === 'next'
      ? tokens.slice(currentIndex + 1)
      : tokens.slice(0, Math.max(0, currentIndex)).reverse();

    const target = searchArr.find(w => w.isLearnable && (!onlyBlue || w.stage === 0));

    if (target) {
      get().setPage(target.pageIndex);
      set({ selectedId: target.id });
    }
  },

  completeLesson: async () => {
    const state = get();

    const remainingBlueTokens = state.tokens.filter(t => (t.stage === 0 || t.status === 'new') && t.isLearnable);

    if (remainingBlueTokens.length === 0) {
      set({ showSummary: true, showModal: false });
      return;
    }

    const uniqueBlueTexts = Array.from(
      new Set(remainingBlueTokens.map(t => t.text.toLowerCase()))
    );

    const coinDelta = uniqueBlueTexts.length * 15;
    const knownDelta = uniqueBlueTexts.length;

    const updatedTokens = state.tokens.map(t => {
      if (t.isLearnable && (t.stage === 0 || t.status === 'new')) {
        return { ...t, stage: 5, status: 'known' as const };
      }
      return t;
    });

    set((state) => ({
      tokens: updatedTokens,
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
    const { phrases, tokens, selectedId, currentPage } = get();
    if (phrases.length === 0) return;

    const currentIndex = phrases.findIndex(p => p.id === selectedId);

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= phrases.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = phrases.length - 1;

    const targetPhrase = phrases[nextIndex];

    const firstTokenId = targetPhrase.range[0];
    const targetToken = tokens.find(t => t.id === firstTokenId);

    if (targetToken && targetToken.pageIndex !== currentPage) {
      get().setPage(targetToken.pageIndex);
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

  importFromLingq: async (apiKey, courseCount, lessonsPerCourse) => {
    try {
      const { languageCode } = get();
      const res = await apiClient('/library/lingq-import', {
        method: 'POST',
        body: JSON.stringify({
          apiKey,
          languageCode,
          courseCount,
          lessonsPerCourse
        })
      });
      if (res.success) {
        set({ hasImportedFromLingq: true });
        // Refresh library stats/feed
        get().fetchLibrary();
      }
      return res;
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
        guidedCourses: s.guidedCourses.filter(c => c.id !== courseId)
      }));

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
      console.error("Delete course failed", err);
      throw err;
    }
  },

  resetCompletion: () => set({ showSummary: false }),
}));

