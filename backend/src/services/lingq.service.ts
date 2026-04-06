import axios from 'axios';
import { db } from '../db/index.js';
import { courses, lessons, userLanguages } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { parseAndSaveLessonContent } from '../utils/lessonParser.js';


export class LingqImportService {
  private static BASE_URL = 'https://www.lingq.com/api';

  /**
   * Orchestrates the import of recommended courses and their lessons from LingQ.
   * Enforces a max of 3 courses and 3 lessons per course as per user requirements.
   */
  static async importRecommended(
    userApiKey: string | undefined,
    userId: string,
    languageCode: string,
    courseCount: number,
    lessonsPerCourse: number
  ) {
    // 1. Determine API Key (Provided vs .env)
    const apiKey = userApiKey || process.env.LINGQ_API_KEY || process.env.LINGQ_TOKEN;

    if (!apiKey) throw new Error('No LingQ API Key provided.');

    const headers = {
      'Authorization': `Token ${apiKey}`,
      'Accept': 'application/json'
    };

    // 2. Fetch Recommended Courses for the language
    // Enforce max 3 courses
    const effectiveCourseCount = Math.min(courseCount, 3);
    const effectiveLessonsPerCourse = Math.min(lessonsPerCourse, 3);

    console.log(`Starting LingQ import for user ${userId} in ${languageCode}...`);

    const coursesRes = await axios.get(`${this.BASE_URL}/languages/${languageCode}/recommended-courses/`, { headers });
    const recommendedCourses = coursesRes.data.results.slice(0, effectiveCourseCount);

    for (const lingqCourse of recommendedCourses) {
      console.log(`Importing course: ${lingqCourse.title}`);

      // Create Course in our DB
      const [newCourse] = await db.insert(courses).values({
        title: lingqCourse.title,
        description: lingqCourse.description,
        language_code: languageCode,
        level: lingqCourse.level,
        image_url: lingqCourse.image,
        owner_id: userId,
        is_public: false
      }).returning();

      if (!newCourse) {
        return ({ error: "Error, new Course is undefined!" })
      }

      // 3. Fetch Lessons for this course ID
      // Some LingQ endpoints use ?collection=, others use ?course=. Based on user snippet, it's ?course=
      const lessonsRes = await axios.get(`${this.BASE_URL}/languages/${languageCode}/course/?course=${lingqCourse.id}`, { headers });

      // The API might return an array or a paginated object. User snippet shows an array.
      const rawLessons = Array.isArray(lessonsRes.data) ? lessonsRes.data : (lessonsRes.data.results || []);
      const lessonsToImport = rawLessons.slice(0, effectiveLessonsPerCourse);

      for (const lingqLesson of lessonsToImport) {
        console.log(`  - Importing lesson: ${lingqLesson.title}`);

        // 4. Fetch Sentences for the lesson to build full text
        const sentencesRes = await axios.get(`${this.BASE_URL}/languages/${languageCode}/lessons/${lingqLesson.id}/sentences/`, { headers });

        // Join sentences with a newline character. 
        // We use \n (newline char) to ensure formatting is preserved without visible escape characters.
        const sentences = Array.isArray(sentencesRes.data) ? sentencesRes.data : (sentencesRes.data.results || []);
        const fullText = Array.isArray(sentences) 
          ? sentences.map((s: string | { text: string }) => (typeof s === 'string' ? s : (s as { text: string }).text || '')).join('\n') 
          : '';


        // Create Lesson in our DB
        const [newLesson] = await db.insert(lessons).values({
          course_id: newCourse.id,
          title: lingqLesson.title,
          description: lingqLesson.description || '',
          image_url: lingqLesson.image_url,
          audio_url: lingqLesson.audio,
          duration: Math.round(lingqLesson.duration || 0),
          is_public: false,
          original_text: fullText
        }).returning();

        if (!newLesson) {
          throw new Error("Error: New lesson could not be created in the database.");
        }

        // 5. Parse and save content using our existing utility (tokenization, pagination)
        await parseAndSaveLessonContent(newLesson.id, fullText, languageCode, userId);
      }
    }

    // 6. Mark user as having completed their one-time import FOR THIS LANGUAGE
    await db.update(userLanguages)
      .set({ has_imported_from_lingq: true })
      .where(and(
        eq(userLanguages.user_id, userId),
        eq(userLanguages.language_code, languageCode)
      ));


    console.log(`✅ LingQ import complete for user ${userId}`);
    return { success: true, count: recommendedCourses.length };
  }
}
