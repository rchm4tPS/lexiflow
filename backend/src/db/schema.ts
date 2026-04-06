import { sqliteTable, text, integer, primaryKey, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

import { randomUUID } from "crypto";

// --- CORE REFERENCES ---
export const languages = sqliteTable("languages", {
  code: text("code").primaryKey(), 
  name: text("name").notNull(),
  is_RTL: integer("is_RTL", { mode: "boolean" }).default(false),
});

// --- USER CORE ---
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  fullname: text("fullname"),
  total_coins: integer("total_coins").default(0),
  preferences: text("preferences", { mode: "json" }).$type<{ targetLanguage: string }>(), // Drizzle handles JSON stringification
});


export const userLanguages = sqliteTable("user_languages", {
  user_id: text("user_id").references(() => users.id).notNull(),
  language_code: text("language_code").references(() => languages.code).notNull(),
  total_known_words: integer("total_known_words").default(0),
  total_lingqs: integer("total_lingqs").default(0),
  daily_goal_tier: text("daily_goal_tier"),
  has_imported_from_lingq: integer("has_imported_from_lingq", { mode: "boolean" }).default(false),
}, (t) => ({
  pk: primaryKey({ columns: [t.user_id, t.language_code] }),
}));

export const streaks = sqliteTable("streaks", {
  user_id: text("user_id").references(() => users.id).notNull(),
  language_code: text("language_code").references(() => languages.code).notNull(),
  current_streak: integer("current_streak").default(0),
  apple_state: text("apple_state"), 
  last_activity_date: integer("last_activity_date", { mode: "timestamp" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.user_id, t.language_code] }),
}));

export const userDailyStats = sqliteTable("user_daily_stats", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  user_id: text("user_id").references(() => users.id).notNull(),
  language_code: text("language_code").references(() => languages.code).notNull(),
  log_date: integer("log_date", { mode: "timestamp" }).notNull(),
  listening_sec: integer("listening_sec").default(0),
  words_read: integer("words_read").default(0),
  lingqs_created: integer("lingqs_created").default(0),
  lingqs_learned: integer("lingqs_learned").default(0),
});

// --- CONTENT HIERARCHY ---
export const courses = sqliteTable("courses", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  language_code: text("language_code").references(() => languages.code).notNull(),
  owner_id: text("owner_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  level: text("level"),
  image_url: text("image_url"),
  is_public: integer("is_public", { mode: "boolean" }).default(false),
  category: text("category", { mode: "json" }), 
});

export const userCourses = sqliteTable("user_courses", {
  user_id: text("user_id").references(() => users.id).notNull(),
  course_id: text("course_id").references(() => courses.id).notNull(),
  added_at: integer("added_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (t) => ({
  pk: primaryKey({ columns:[t.user_id, t.course_id] }),
}));

export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  course_id: text("course_id").references(() => courses.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  duration: integer("duration").default(0),
  image_url: text("image_url"),
  audio_url: text("audio_url"),
  total_words: integer("total_words").default(0),
  unique_words: integer("unique_words").default(0),
  original_text: text("original_text"),
  is_archived: integer("is_archived", { mode: "boolean" }).default(false),
  is_public: integer("is_public", { mode: "boolean" }).default(false),
  last_update_date: integer("last_update_date", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const lessonContent = sqliteTable("lesson_content", {
  lesson_id: text("lesson_id").primaryKey().references(() => lessons.id),
  raw_text: text("raw_text").notNull(),
  audio_timestamps: text("audio_timestamps", { mode: "json" }), 
});

export const userLessonProgress = sqliteTable("user_lesson_progress", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  user_id: text("user_id").references(() => users.id).notNull(),
  lesson_id: text("lesson_id").references(() => lessons.id).notNull(),
  total_listened_sec: integer("total_listened_sec").default(0),
  highest_page_read: integer("highest_page_read").default(0),
  is_completed: integer("is_completed", { mode: "boolean" }).default(false),
  is_bookmarked: integer("is_bookmarked", { mode: "boolean" }).default(false),
  new_words_count: integer("new_words_count").default(0),
  lingqs_count: integer("lingqs_count").default(0),
  known_words_count: integer("known_words_count").default(0),
  read_times: integer("read_times").default(0),
  last_read_at: integer("last_read_at", { mode: "timestamp" }),
}, (t) => ({
  unq: uniqueIndex("user_lesson_unq").on(t.user_id, t.lesson_id)
}));

// --- VOCABULARY MAPPING ---
export const masterVocab = sqliteTable("master_vocab", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  original_word: text("original_word").notNull(),
  lemma: text("lemma"),
  language_code: text("language_code").references(() => languages.code).notNull(),
});

export const userVocabRelation = sqliteTable("user_vocab_relation", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  user_id: text("user_id").references(() => users.id).notNull(),
  master_word_id: text("master_word_id").references(() => masterVocab.id).notNull(),
  stage: integer("stage").default(0), 
  user_meaning: text("user_meaning"),
  word_tag: text("word_tag"), 
  notes: text("notes"),
  related_phrase_occur: text("related_phrase_occur"),
  is_ignored_initially: integer("is_ignored_initially", { mode: "boolean" }).default(false),
  created_as_lingq: integer("created_as_lingq", { mode: "boolean" }).default(false),
  last_reviewed: integer("last_reviewed", { mode: "timestamp" }).$defaultFn(() => new Date()),
  created_at: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const userPhrases = sqliteTable("user_phrases", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  user_id: text("user_id").references(() => users.id).notNull(),
  language_code: text("language_code").references(() => languages.code).notNull(),
  phrase_text: text("phrase_text").notNull(),
  user_meaning: text("user_meaning"),
  stage: integer("stage").default(1),
  phrase_tags: text("phrase_tags"),
  notes: text("notes"),
  related_phrase_occur: text("related_phrase_occur"),
  last_reviewed: integer("last_reviewed", { mode: "timestamp" }).$defaultFn(() => new Date()),
  created_at: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const externalHintsCache = sqliteTable("external_hints_cache", {
  word: text("word").notNull(),
  language_code: text("language_code").notNull(),
  hints_json: text("hints_json").notNull(), // Store the API response stringified
  last_updated: integer("last_updated", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (t) => ({
  pk: primaryKey({ columns: [t.word, t.language_code] }),
}));

export const vocabTransitions = sqliteTable("vocab_transitions", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  user_id: text("user_id").references(() => users.id).notNull(),
  master_word_id: text("master_word_id").references(() => masterVocab.id).notNull(),
  old_stage: integer("old_stage").notNull(),
  new_stage: integer("new_stage").notNull(),
  created_at: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const phraseTransitions = sqliteTable("phrase_transitions", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  user_id: text("user_id").references(() => users.id).notNull(),
  phrase_id: text("phrase_id").references(() => userPhrases.id).notNull(),
  old_stage: integer("old_stage").notNull(),
  new_stage: integer("new_stage").notNull(),
  created_at: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});