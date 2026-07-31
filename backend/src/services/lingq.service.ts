import axios from 'axios';
import { db } from '../db/index.js';
import { courses, lessons, userLanguages, lessonContent, lingqTranslationCache } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { parseAndSaveLessonContent } from '../utils/lessonParser.js';
import { parseLingqTranslationXml, type ParsedTranslation } from '../utils/translationParser.js';


export class LingqImportService {
  private static BASE_URL = 'https://www.lingq.com/api';

  static async fetchRecommendedCourses(userApiKey: string | undefined, languageCode: string) {
    const apiKey = userApiKey || process.env.LINGQ_TOKEN;
    if (!apiKey) throw new Error('No LingQ API Key provided.');

    const headers = {
      'Authorization': `Token ${apiKey}`,
      'Accept': 'application/json'
    };

    const coursesRes = await axios.get(`${this.BASE_URL}/languages/${languageCode}/recommended-courses/`, { headers });
    return coursesRes.data;
  }

  static async fetchCourseLessons(userApiKey: string | undefined, languageCode: string, courseId: string) {
    const apiKey = userApiKey || process.env.LINGQ_TOKEN;
    if (!apiKey) throw new Error('No LingQ API Key provided.');

    const headers = {
      'Authorization': `Token ${apiKey}`,
      'Accept': 'application/json'
    };

    const lessonsRes = await axios.get(`${this.BASE_URL}/languages/${languageCode}/course/?course=${courseId}`, { headers });
    return lessonsRes.data;
  }

  static async importSelectedLessons(
    userApiKey: string | undefined,
    userId: string,
    languageCode: string,
    selectedLessons: {
      courseId: number;
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
    }[]
  ) {
    const apiKey = userApiKey || process.env.LINGQ_TOKEN;
    if (!apiKey) throw new Error('No LingQ API Key provided.');

    const headers = {
      'Authorization': `Token ${apiKey}`,
      'Accept': 'application/json'
    };

    // Note: Limit checking is done in the route handler before calling this

    const results = [];
    
    for (const lingqLesson of selectedLessons) {
      // 1. Ensure Course Exists or Create It
      // Look for a course owned by this user, in this language, with this lingq_id
      const [existingCourse] = await db.select().from(courses).where(and(
        eq(courses.owner_id, userId),
        eq(courses.language_code, languageCode),
        eq(courses.lingq_id, lingqLesson.courseId)
      ));

      let dbCourseId = existingCourse?.id;

      if (!existingCourse) {
        const [newCourse] = await db.insert(courses).values({
          title: lingqLesson.courseTitle,
          description: lingqLesson.courseDescription || '',
          language_code: languageCode,
          level: lingqLesson.courseLevel,
          image_url: lingqLesson.courseImageUrl,
          owner_id: userId,
          is_public: false,
          lingq_id: lingqLesson.courseId
        }).returning();
        
        if (!newCourse) throw new Error("Failed to create course in DB.");
        dbCourseId = newCourse.id;
      }

      // 2. Fetch Sentences for the lesson
      const sentencesRes = await axios.get(`${this.BASE_URL}/languages/${languageCode}/lessons/${lingqLesson.lessonId}/sentences/`, { headers });
      const sentences = Array.isArray(sentencesRes.data) ? sentencesRes.data : (sentencesRes.data.results || []);
      const fullText = Array.isArray(sentences) 
        ? sentences.map((s: string | { text: string }) => (typeof s === 'string' ? s : (s as { text: string }).text || '')).join('\n') 
        : '';

      // 3. Create Lesson in our DB
      const [newLesson] = await db.insert(lessons).values({
        course_id: dbCourseId!,
        title: lingqLesson.lessonTitle,
        description: lingqLesson.lessonDescription || '',
        image_url: lingqLesson.lessonImageUrl,
        audio_url: lingqLesson.lessonAudioUrl,
        duration: Math.round(lingqLesson.lessonDuration || 0),
        is_public: false,
        original_text: fullText,
        original_url: `https://www.lingq.com/en/learn/${languageCode}/web/reader/${lingqLesson.lessonId}`,
        lingq_id: lingqLesson.lessonId
      }).returning();

      if (!newLesson) throw new Error("Failed to create lesson in DB.");

      // 4. Parse Content
      await parseAndSaveLessonContent(newLesson.id, fullText, languageCode, userId, true);

      // 5. Pre-fetch and cache the translation/audio-timestamps (non-fatal — some lessons
      // have no translation available, and import must still succeed either way).
      try {
        await this.fetchAndCacheTranslationForLesson(newLesson.id);
      } catch (e) {
        console.warn(`Could not pre-cache translation for lesson ${newLesson.id}:`, e);
      }

      results.push({ lessonId: newLesson.id, title: newLesson.title });
    }

    return { success: true, count: selectedLessons.length, results };
  }

  // Proxy the LingQ lesson text/translation endpoint — uses LINGQ_TOKEN from env
  static async fetchLessonTranslation(languageCode: string, lingqLessonId: number): Promise<string> {
    const apiKey = process.env.LINGQ_TOKEN;
    if (!apiKey) throw new Error('LINGQ_TOKEN is not configured on the server.');

    const headers = {
      'Authorization': `Token ${apiKey}`,
      'Accept': 'application/json'
    };

    // LingQ API returns JSON: { "text": "<article>...</article>" }
    const url = `${this.BASE_URL}/languages/${languageCode}/lessons/${lingqLessonId}/text/`;
    const res = await axios.get(url, { headers });
    const xmlText: string = res.data?.text;
    if (!xmlText) throw new Error('LingQ API returned no text field.');
    return xmlText;
  }

  // Global cache-aside lookup, keyed by LingQ's own lesson id — shared by every user/lesson
  // that imports the same LingQ lesson, so we hit LingQ's /text/ endpoint at most once per lesson ever.
  static async getOrFetchTranslation(lingqLessonId: number, languageCode: string): Promise<ParsedTranslation> {
    const [cached] = await db.select().from(lingqTranslationCache).where(and(
      eq(lingqTranslationCache.lingq_lesson_id, lingqLessonId),
      eq(lingqTranslationCache.language_code, languageCode)
    ));

    if (cached) {
      return { sentences: cached.sentences, timestamps: cached.timestamps };
    }

    const xmlText = await this.fetchLessonTranslation(languageCode, lingqLessonId);
    const parsed = parseLingqTranslationXml(xmlText);

    await db.insert(lingqTranslationCache).values({
      lingq_lesson_id: lingqLessonId,
      language_code: languageCode,
      sentences: parsed.sentences,
      timestamps: parsed.timestamps,
    }).onConflictDoNothing();

    return parsed;
  }

  // Per-lesson wrapper: resolves our internal lesson to its LingQ ids, fetches/reuses the
  // global translation cache, and write-throughs a denormalized copy into lesson_content.audio_timestamps
  // so the reader page can read timing without an extra join.
  static async fetchAndCacheTranslationForLesson(lessonDbId: string): Promise<ParsedTranslation | null> {
    const [lessonData] = await db.select({
      lingq_id: lessons.lingq_id,
      language_code: courses.language_code,
    })
      .from(lessons)
      .innerJoin(courses, eq(lessons.course_id, courses.id))
      .where(eq(lessons.id, lessonDbId));

    if (!lessonData?.lingq_id) return null;

    const result = await this.getOrFetchTranslation(lessonData.lingq_id, lessonData.language_code);

    // Only set default audio_timestamps if lesson_content currently has no timestamps,
    // preserving any user-customized edits!
    const [content] = await db.select({ audio_timestamps: lessonContent.audio_timestamps })
      .from(lessonContent)
      .where(eq(lessonContent.lesson_id, lessonDbId));

    if (!content?.audio_timestamps) {
      await db.update(lessonContent)
        .set({ audio_timestamps: result.timestamps })
        .where(eq(lessonContent.lesson_id, lessonDbId));
    }

    return result;
  }
}
