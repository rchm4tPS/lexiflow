import { Router } from 'express';
import { db } from '../db/index.js';
import { 
    userLanguages, users,
    lessons, 
    lessonContent, 
    masterVocab, 
    userVocabRelation, 
    courses, 
    userPhrases,
    userCourses,
    userLessonProgress,
    languages
} from '../db/schema.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { eq, and, sql } from 'drizzle-orm';
import { updateDailyStatsAndStreak } from '../utils/statsEngine.js';
import { parseAndSaveLessonContent } from '../utils/lessonParser.js';

const router = Router();

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const lessonId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!lessonId) return res.status(400).json({ error: "Invalid lesson id" });

    const [content] = await db.select().from(lessonContent)
      .where(eq(lessonContent.lesson_id, lessonId));
    
    if (!content) return res.status(404).json({ error: "Lesson content not found" });

    // 2. Get lesson details along with course and language RTL status
    const [lessonData] = await db.select({
      lesson: lessons,
      course: courses,
      isRTL: languages.is_RTL
    })
      .from(lessons)
      .innerJoin(courses, eq(lessons.course_id, courses.id))
      .innerJoin(languages, eq(courses.language_code, languages.code))
      .where(eq(lessons.id, lessonId));

    if (!lessonData) return res.status(404).json({ error: "Lesson or Course metadata not found" });

    const { lesson, course, isRTL } = lessonData;
    const userId = req.user!.id;

    // Auto-Enroll the user in this course (Ignored if already exists)
    await db.insert(userCourses).values({
        user_id: userId,
        course_id: course.id,
        added_at: new Date()
    }).onConflictDoNothing();

    // In our parse route, we saved tokens as a JSON string in raw_text
    const tokens = JSON.parse(content.raw_text);

    // 1. Fetch ALL of THIS user's vocabulary for THIS language at once
    // This is much faster than querying inside a loop
    const userVocab = await db.select({
        word: masterVocab.original_word,
        stage: userVocabRelation.stage,
        meaning: userVocabRelation.user_meaning,
        word_tag: userVocabRelation.word_tag,
        notes: userVocabRelation.notes
    })
    .from(userVocabRelation)
    .innerJoin(masterVocab, eq(userVocabRelation.master_word_id, masterVocab.id))
    .where(eq(userVocabRelation.user_id, userId));

    // Convert to a Map for O(1) lookup
    const vocabMap = new Map(userVocab.map(v => [v.word.toLowerCase(), v]));

    // 2. Decorate tokens
    const decoratedTokens = tokens.map((t: Record<string, unknown>) => {
        if (!t.isLearnable) return t;
        
        const userData = vocabMap.get(String(t.text).toLowerCase());
        return {
            ...t,
            stage: userData?.stage ?? 0,
            meaning: userData?.meaning ?? "",
            notes: userData?.notes ?? "",
            status: userData?.stage === 5 ? 'known' : (userData ? 'learning' : 'new'),
            word_tags: userData?.word_tag ? userData.word_tag.split(',') :[] // NEW: Array of tags
        };
    });

    const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
    const totalCoins = userRecord?.total_coins || 0;

    // --- SIBLING NAVIGATION LOGIC ---
    // Fetch all siblings in this course to find prev/next
    const courseLessons = await db.select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.course_id, course.id))
      .orderBy(sql`${lessons.order} ASC`, sql`${lessons.id} ASC`);

    const currentIndex = courseLessons.findIndex(l => l.id === lessonId);
    const prevLessonId = currentIndex > 0 ? courseLessons[currentIndex - 1]?.id : null;
    const nextLessonId = currentIndex !== -1 && currentIndex < courseLessons.length - 1 
      ? courseLessons[currentIndex + 1]?.id 
      : null;

    // Fetch or Initialize User Language Stats
    let [langRecord] = await db.select().from(userLanguages)
      .where(and(eq(userLanguages.user_id, userId), eq(userLanguages.language_code, course.language_code)));

    if (!langRecord) {
      [langRecord] = await db.insert(userLanguages).values({
        user_id: userId,
        language_code: course.language_code,
        daily_goal_tier: 'calm', // Default tier
        total_known_words: 0,
        total_lingqs: 0
      }).returning();
    }

    // NEW: Fetch all user phrases for this language
    const userSavedPhrases = await db.select().from(userPhrases)
      .where(and(
        eq(userPhrases.user_id, userId), 
        eq(userPhrases.language_code, course.language_code)
      ));

    // Normalize userSavedPhrases if some of data may has null value
    const normalizedPhrases = userSavedPhrases.map(p => ({
      ...p,
      stage: p.stage ?? 0
    }));

    // Fetch user's own lesson progress for this lesson (frontier, etc.)
    let [userProgress] = await db.select().from(userLessonProgress)
      .where(and(eq(userLessonProgress.lesson_id, String(lessonId)), eq(userLessonProgress.user_id, userId)));

    // Update: Record visit time ONLY if progress sync happens, not on initial fetch
    // If no progress row exists yet, create one (e.g. from feed) with null last_read_at
    if (!userProgress) {
      [userProgress] = await db.insert(userLessonProgress).values({
        user_id: userId,
        lesson_id: String(lessonId),
        new_words_count: lesson.unique_words || 0,
        lingqs_count: 0,
        known_words_count: 0,
      }).returning();
    }

    res.json({ 
        tokens: decoratedTokens, 
        phrases: normalizedPhrases,
        languageCode: course.language_code,
        isRTL: isRTL || false,
        totalCoins: totalCoins,
        totalKnownWords: langRecord!.total_known_words,
        courseTitle: course.title,
        courseLevel: course.level,
        lessonTitle: lesson.title, 
        lessonImg: lesson.image_url,
        lessonAudio: lesson.audio_url,
        highestPageRead: userProgress?.highest_page_read ?? 0,
        prevLessonId,
        nextLessonId
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

router.post('/parse', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, 
      description, 
      imageUrl, 
      audioUrl,
      audioDuration,
      isPublic,
      rawText, courseId, languageCode } = req.body;
    const userId = req.user!.id;

    // 1. Create the Lesson Entry
    const [newLesson] = await db.insert(lessons).values({
      course_id: courseId,
      title: title,
      description: description || '',
      image_url: imageUrl || '',
      audio_url: audioUrl || '',
      duration: Math.round(audioDuration || 0),
      is_public: isPublic === true,
      original_text: rawText,
    }).returning();

    if (!newLesson?.id) throw new Error('Lesson creation failed');

    // 2. Parse content and initialize progress using utility
    const tokens = await parseAndSaveLessonContent(newLesson.id, rawText, languageCode, userId);

    res.json({ lessonId: newLesson.id, tokens });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// NEW: Fetch metadata and original text for editing
router.get('/:id/edit', authenticate, async (req: AuthRequest, res) => {
  try {
    const lessonId = req.params.id;
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, String(lessonId)));
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    
    // Check ownership via course
    const [course] = await db.select().from(courses).where(eq(courses.id, lesson.course_id));
    if (course?.owner_id !== req.user!.id) {
       return res.status(403).json({ error: "You do not have permission to edit this lesson." });
    }

    res.json(lesson);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// NEW: Update lesson and re-parse if needed
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user!.id;
    const { title, description, imageUrl, audioUrl, audioDuration, isPublic, rawText, courseId, languageCode } = req.body;

    const [existing] = await db.select().from(lessons).where(eq(lessons.id, String(lessonId)));
    if (!existing) return res.status(404).json({ error: "Lesson not found" });

    // Verify ownership
    const [course] = await db.select().from(courses).where(eq(courses.id, existing.course_id));
    if (course?.owner_id !== userId) return res.status(403).json({ error: "Access denied" });

    // 1. Update Lesson Metadata
    await db.update(lessons).set({
      title,
      description: description || '',
      image_url: imageUrl || '',
      audio_url: audioUrl || '',
      duration: Math.round(audioDuration || 0),
      is_public: isPublic === true,
      course_id: courseId,
      original_text: rawText || existing.original_text
    }).where(eq(lessons.id, String(lessonId)));

    // 2. If text is provided, always re-parse to apply latest pagination logic/limits
    if (rawText) {
      await parseAndSaveLessonContent(String(lessonId), rawText, languageCode, userId);
    }

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// Add this to backend/src/routes/reader.ts
// NEW: Delete lesson
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user!.id;

    const [existing] = await db.select().from(lessons).where(eq(lessons.id, String(lessonId)));
    if (!existing) return res.status(404).json({ error: "Lesson not found" });

    // Verify ownership
    const [course] = await db.select().from(courses).where(eq(courses.id, existing.course_id));
    if (course?.owner_id !== userId) return res.status(403).json({ error: "Access denied" });

    // Delete content, progress, and lesson
    await db.delete(lessonContent).where(eq(lessonContent.lesson_id, String(lessonId)));
    await db.delete(userLessonProgress).where(eq(userLessonProgress.lesson_id, String(lessonId)));
    await db.delete(lessons).where(eq(lessons.id, String(lessonId)));

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

router.put('/:id/progress', authenticate, async (req: AuthRequest, res) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user!.id;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ error: 'Invalid lessonId' });
    }

    const { newWordsCount, lingqsCount, knownWordsCount, highestPageRead, isCompleted, listeningSec, wordsRead, incrementReadTime } = req.body;

    const [existing] = await db.select().from(userLessonProgress)
      .where(and(eq(userLessonProgress.lesson_id, lessonId), eq(userLessonProgress.user_id, userId)));

    let previousListenedSec = 0;

    if (existing) {
      previousListenedSec = existing.total_listened_sec || 0;
      // Protect is_completed: once true, it can never go back to false.
      // Removed auto-fulfillment when newWordsCount hits 0; user must explicitly complete.
      const isAutoCompleted = isCompleted || false;
      const preservedCompleted = isAutoCompleted ? true : (existing.is_completed ?? false);

      const isActivity = 
        (listeningSec && listeningSec > 0) || 
        (wordsRead && wordsRead > 0) || 
        incrementReadTime || 
        isCompleted || 
        (existing.new_words_count !== (newWordsCount ?? existing.new_words_count)) ||
        (existing.lingqs_count !== (lingqsCount ?? existing.lingqs_count));

      await db.update(userLessonProgress).set({
        new_words_count: newWordsCount,
        lingqs_count: lingqsCount,
        known_words_count: knownWordsCount,
        total_listened_sec: previousListenedSec + (listeningSec || 0),
        highest_page_read: (highestPageRead !== undefined) ? highestPageRead : (existing.highest_page_read || 0),
        is_completed: preservedCompleted,
        ...(isActivity ? { last_read_at: new Date() } : {})
      }).where(eq(userLessonProgress.id, existing.id));
    } else {
      const isActivity = (listeningSec && listeningSec > 0) || (wordsRead && wordsRead > 0) || isCompleted;

      await db.insert(userLessonProgress).values({
        user_id: userId,
        lesson_id: lessonId,
        new_words_count: newWordsCount ?? 0,
        lingqs_count: lingqsCount ?? 0,
        known_words_count: knownWordsCount ?? 0,
        total_listened_sec: listeningSec || 0,
        highest_page_read: highestPageRead ?? 0,
        is_completed: isCompleted || false, 
        ...(isActivity ? { last_read_at: new Date() } : {})
      });
    }

      // 2. Update daily stats and check streak via central engine
      const [lessonCourse] = await db.select({ lang: courses.language_code }).from(lessons).innerJoin(courses, eq(lessons.course_id, courses.id)).where(eq(lessons.id, lessonId));
      if (lessonCourse) {
        await updateDailyStatsAndStreak(userId, lessonCourse.lang, { 
          listeningSec: listeningSec || 0,
          wordsRead: wordsRead || 0
        });
      }
     else if (wordsRead && wordsRead > 0) {
      // Handle the case where user has words read but no listening time in this sync
      const [lessonCourse] = await db.select({ lang: courses.language_code }).from(lessons).innerJoin(courses, eq(lessons.course_id, courses.id)).where(eq(lessons.id, lessonId));
      if (lessonCourse) {
        await updateDailyStatsAndStreak(userId, lessonCourse.lang, { 
          listeningSec: 0,
          wordsRead: wordsRead
        });
      }
     }

    // 3. Update read_times on the user's progress record
    if (incrementReadTime === true) {
      await db.update(userLessonProgress)
        .set({ read_times: sql`${userLessonProgress.read_times} + 1` })
        .where(and(eq(userLessonProgress.lesson_id, lessonId), eq(userLessonProgress.user_id, userId)));
    }

    // Note: wordsRead is already handled in the listeningSec check block above if both are provided.
    // If wordsRead was provided without listeningSec (rare in this app), we'd need another block,
    // but typically they are synced together.

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

export default router;