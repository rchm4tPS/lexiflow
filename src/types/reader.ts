export interface Token {
  id: string;
  text: string;
  pageIndex: number;
  sentencePageIndex?: number; // NEW: for Sentence View
  isLearnable: boolean;
  isNewline?: boolean;
  status?: 'new' | 'learning' | 'known' | 'ignored';
  stage?: number;
  meaning?: string;
  /** JSON array of multiple meanings — first element is the primary meaning */
  meanings?: string[];
  notes?: string;
  word_tags?: string[];
  isIgnoredInitially?: boolean;
  isDraft?: false;
  isPhrase?: false;
}

export interface Phrase {
  id: string;
  dbId: string;
  text: string;
  range: string[];
  stage: number;
  meaning?: string;
  /** JSON array of multiple meanings — first element is the primary meaning */
  meanings?: string[];
  phrase_tags?: string | string[];
  notes?: string;
  word_tags?: string[];
  isPhrase: true;
  isDraft?: false;
}

export interface DbPhrase {
  id: string;
  phrase_text: string;
  stage: number;
  meaning?: string;
  user_meaning?: string;
  phrase_tags?: string;
  notes?: string;
}

export interface Lesson {
  id: string;
  title: string;
  course_id: string;
  course_title?: string;
  image_url?: string;
  audio_url?: string;
  audio_duration?: number;
  is_completed: boolean;
  is_bookmarked: boolean;
  new_words_count: number;
  total_words_count: number;
  highest_page_read?: number;
  user_new_words?: number | null;
  unique_words?: number;
  user_lingqs?: number;
  course_level?: string;
  lingq_id?: number;
  owner_id?: string;
}

export interface Course {
  id: string;
  title: string;
  level: string;
  description?: string;
  image_url?: string;
  is_public: boolean;
  language_code: string;
  lesson_count?: number;
  lessons?: Lesson[];
  // Calculated fields
  blue_remaining?: number;
  total_unique_words?: number;
  completion_pct?: number;
  total_lingqs_count?: number;
  blue_remaining_pct?: number;
  total_lingqs?: number;
  owner_id?: string;
  owner_username?: string;
  total_duration?: number;
  lingq_id?: number;
}

export interface CourseDetail {
  course: Course;
  lessons: Lesson[];
}

export interface WordHint {
  text: string;
  popularity: number;
}

export interface UserStats {
  date?: string; // Optional for daily breakdown
  created: number;
  learned: number;
  listening: number;
  words: number;
}

export interface MarkovInsights {
  hasInsights: boolean;
  discoveryVelocity: number;
  metrics: {
      steady_mastery: number;
      learning_success_rate: number;
      forgetting_rate: number;
      learning_friction: number;
  };
  stationary: {
      learning_load: number;
      steady_mastery: number;
      filtered_proportion: number;
  };
}

export interface UpdatePayload {
  id: string;
  stage: number;
  meaning?: string;
  /** JSON array of multiple meanings — first element is the primary meaning */
  meanings?: string[];
  tags?: string[];
  notes?: string;
}
export interface DraftPhrase {
  text: string;
  stage: number;
  range: string[];
  id?: string; // Optional for draft
  isDraft: true;
  isPhrase?: false;
  meaning?: string;
  /** JSON array of multiple meanings — first element is the primary meaning */
  meanings?: string[];
  notes?: string;
  word_tags?: string[];
}

export type SidebarItem = Token | Phrase | DraftPhrase;

/** A course as returned by the LingQ import endpoints. */
export interface LingqCourse {
  id: string;
  title: string;
  description: string;
  level: string;
  image: string;
}

/** A lesson as returned by the LingQ import endpoints. */
export interface LingqLesson {
  id: number;
  title: string;
  description: string;
  image_url: string;
  audio: string;
  duration: number;
  /**
   * The LingQ payload is inconsistent across endpoints, so the UI probes each
   * spelling in turn. Modelled as optional aliases rather than collapsed, so
   * the fallback chains stay type-checked.
   */
  audio_url?: string;
  has_audio?: boolean;
  new_word_count?: number;
  newWordsCount?: number;
  new_words_count?: number;
  wordsCount?: number;
  wordCount?: number;
}

/**
 * A lesson the user has ticked, flattened and camelCased for the import
 * payload. Built in the UI; the store forwards it to the backend verbatim.
 */
export interface SelectedLingqLesson {
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  courseLevel: string;
  courseImageUrl: string;
  lessonId: number;
  lessonTitle: string;
  lessonDescription: string;
  lessonImageUrl: string;
  lessonAudioUrl: string;
  lessonDuration: number;
}

/**
 * `fetchLingqCourseLessons` may answer with a bare array or a paginated
 * `{ results }` envelope, so both are modelled.
 */
export type LingqLessonsResponse = LingqLesson[] | { results?: LingqLesson[] };
