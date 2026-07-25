import axios from 'axios';
import { db } from '../db/index.js';
import { courses, lessons, userLanguages } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { parseAndSaveLessonContent } from '../utils/lessonParser.js';


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
      
      results.push({ lessonId: newLesson.id, title: newLesson.title });
    }

    return { success: true, count: selectedLessons.length, results };
  }
}
