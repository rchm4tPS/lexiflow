import { Router } from 'express';
import { db } from '../db/index.js';
import { courses, lessons, userCourses, userLessonProgress, lessonContent, userVocabRelation, masterVocab, userLanguages, users } from '../db/schema.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { eq, and, sql, notInArray, inArray, like, isNotNull, or } from 'drizzle-orm';
import { LingqImportService } from '../services/lingq.service.js';
import { LEVELS } from '../constants/levels.js';


const router = Router();

// 1. Create a New Course
router.post('/courses', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { title, description, languageCode, level, imageUrl, isPublic } = req.body;

    const [newCourse] = await db.insert(courses).values({
      title,
      description: description || '',
      language_code: languageCode,
      level: level || 'Beginner 1',
      image_url: imageUrl || '',
      owner_id: userId,
      is_public: isPublic === true
    }).returning();

    res.json({ success: true, course: newCourse });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

router.delete('/courses/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const courseId = req.params.id;
    const { confirm } = req.query;

    // 1. Verify ownership
    const [course] = await db.select().from(courses).where(and(eq(courses.id, String(courseId)), eq(courses.owner_id, userId)));
    if (!course) return res.status(404).json({ error: 'Course not found or access denied' });

    // 2. Safety Check: Count lessons
    const courseLessons = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.course_id, String(courseId)));
    
    if (courseLessons.length > 0 && confirm !== 'true') {
      return res.status(400).json({ 
        error: 'confirm_required', 
        message: `This course contains ${courseLessons.length} lessons. Deleting it will permanently remove all of them.`,
        lessonCount: courseLessons.length
      });
    }

    // 3. NUCLEAR DELETE TRANSACTION
    await db.transaction(async (tx) => {
        const lessonIds = courseLessons.map(l => l.id);

        if (lessonIds.length > 0) {
            // Delete Lesson Progress
            await tx.delete(userLessonProgress).where(inArray(userLessonProgress.lesson_id, lessonIds));
            // Delete Lesson Content
            await tx.delete(lessonContent).where(inArray(lessonContent.lesson_id, lessonIds));
            // Delete Lessons
            await tx.delete(lessons).where(inArray(lessons.id, lessonIds));
        }

        // Delete Enrollments
        await tx.delete(userCourses).where(eq(userCourses.course_id, String(courseId)));
        // Delete Course
        await tx.delete(courses).where(eq(courses.id, String(courseId)));
    });

    res.json({ success: true, message: 'Course and all associated lessons deleted.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});


// 2. Get All Courses in specific user's language of interest
router.get('/courses', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { lang } = req.query;

    const myCourses = await db.select()
      .from(courses)
      .where(and(
        eq(courses.owner_id, userId),
        eq(courses.language_code, String(lang))
      ));

    res.json(myCourses);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// 3. Get All Lessons Feed — EXCLUDES lessons belonging to courses the user is already enrolled in
router.get('/feed/:langCode', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const lang = String(req.params.langCode);

    if (!lang || lang === 'undefined') {
      return res.status(400).json({ error: 'Valid language code is required' });
    }

    // Find all course IDs the user is already enrolled in
    const enrolledCourses = await db.select({ course_id: userCourses.course_id })
      .from(userCourses)
      .where(eq(userCourses.user_id, userId));

    const enrolledCourseIds = enrolledCourses.map(e => e.course_id);

    const { search, minLevel, maxLevel } = req.query;
    const searchPattern = search ? `%${String(search).toLowerCase()}%` : null;

    const levelsArray: readonly string[] = LEVELS;
    let allowedLevels: string[] = [...LEVELS];
    if (minLevel || maxLevel) {
      const minIdx = minLevel ? levelsArray.indexOf(String(minLevel)) : 0;
      const maxIdx = maxLevel ? levelsArray.indexOf(String(maxLevel)) : levelsArray.length - 1;
      const startIdx = minIdx !== -1 ? minIdx : 0;
      const endIdx = maxIdx !== -1 ? maxIdx : levelsArray.length - 1;
      allowedLevels = LEVELS.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
    }

    // Build the lesson feed, excluding lessons from enrolled courses
    const feedQuery = db.select({
      id: lessons.id,
      title: lessons.title,
      course_title: courses.title,
      course_level: courses.level,
      image_url: lessons.image_url,
      total_words: lessons.total_words,
      unique_words: lessons.unique_words,
      user_new_words: userLessonProgress.new_words_count,
      user_lingqs: userLessonProgress.lingqs_count,
      is_bookmarked: userLessonProgress.is_bookmarked,
      is_completed: userLessonProgress.is_completed,
      lingq_id: lessons.lingq_id,
      owner_id: courses.owner_id,
    })
    .from(lessons)
    .innerJoin(courses, eq(lessons.course_id, courses.id))
    .leftJoin(userLessonProgress, and(
      eq(userLessonProgress.lesson_id, lessons.id),
      eq(userLessonProgress.user_id, userId)
    ))
    .where(and(
      eq(courses.language_code, lang),
      enrolledCourseIds.length > 0 ? notInArray(lessons.course_id, enrolledCourseIds) : sql`1=1`,
      searchPattern ? like(sql`lower(${lessons.title})`, searchPattern) : sql`1=1`,
      allowedLevels.length > 0 ? inArray(courses.level, allowedLevels) : sql`1=1`
    ));

    const feed = await feedQuery;

    const missingLessonIds = feed.filter(item => item.user_new_words === null).map(l => l.id);
    const initializedProgressMap = await initializeMissingProgress(userId, lang, missingLessonIds);

    const normalizedFeed = feed.map(item => {
      let new_words = item.user_new_words;
      let lingqs = item.user_lingqs ?? 0;
      let completed = item.is_completed ?? false;

      if (new_words === null) {
         const p = initializedProgressMap.get(item.id);
         if (p) {
             new_words = p.new_words_count;
             lingqs = p.lingqs_count;
             completed = p.is_completed;
         }
      }

      return {
          ...item,
          user_new_words: new_words !== null ? new_words : item.unique_words,
          user_lingqs: lingqs,
          is_bookmarked: item.is_bookmarked ?? false,
          is_completed: completed,
      };
    });

    res.json(normalizedFeed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// 4. My Lessons — Lessons the user has enrolled in (with optional completed filter)
router.get('/my-lessons', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { lang, completed, search } = req.query;
    const searchPattern = search ? `%${String(search).toLowerCase()}%` : null;

    const myFeed = await db.select({
      id: lessons.id,
      title: lessons.title,
      course_id: lessons.course_id,
      course_title: courses.title,
      course_level: courses.level,
      image_url: lessons.image_url,
      total_words: lessons.total_words,
      unique_words: lessons.unique_words,
      user_new_words: userLessonProgress.new_words_count,
      user_lingqs: userLessonProgress.lingqs_count,
      is_completed: userLessonProgress.is_completed,
      is_bookmarked: userLessonProgress.is_bookmarked,
      lingq_id: lessons.lingq_id,
      owner_id: courses.owner_id,
    })
    .from(userCourses)
    .innerJoin(courses, eq(userCourses.course_id, courses.id))
    .innerJoin(lessons, eq(courses.id, lessons.course_id))
    .leftJoin(userLessonProgress, and(
      eq(userLessonProgress.lesson_id, lessons.id),
      eq(userLessonProgress.user_id, userId)
    ))
    .where(and(
      eq(courses.language_code, String(lang)),
      eq(userCourses.user_id, userId),
      searchPattern ? like(sql`lower(${lessons.title})`, searchPattern) : sql`1=1`
    ));

    const missingLessonIds = myFeed.filter(item => item.user_new_words === null).map(l => l.id);
    const initializedProgressMap = await initializeMissingProgress(userId, String(lang), missingLessonIds);

    const normalized = myFeed.map(l => {
      let new_words = l.user_new_words;
      let lingqs = l.user_lingqs ?? 0;
      let completed = l.is_completed ?? false;

      if (new_words === null) {
         const p = initializedProgressMap.get(l.id);
         if (p) {
             new_words = p.new_words_count;
             lingqs = p.lingqs_count;
             completed = p.is_completed;
         }
      }

      return {
          ...l,
          user_new_words: new_words !== null ? new_words : l.unique_words,
          user_lingqs: lingqs,
          is_completed: completed,
          is_bookmarked: l.is_bookmarked ?? false,
      };
    });

    // Filter by completed status if query param provided
    if (completed === 'true') {
      return res.json(normalized.filter(l => l.is_completed));
    }
    if (completed === 'false') {
      return res.json(normalized.filter(l => !l.is_completed));
    }

    res.json(normalized);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// 5. Batch check-and-update completions:
//    For every user_lesson_progress where new_words_count = 0, mark is_completed = true
router.post('/check-completions', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { lang } = req.body;

    // Find all progress rows for this user (in this language) where new_words_count = 0
    // but is_completed is still false
    const candidates = await db.select({
      id: userLessonProgress.id,
      lesson_id: userLessonProgress.lesson_id,
    })
    .from(userLessonProgress)
    .innerJoin(lessons, eq(userLessonProgress.lesson_id, lessons.id))
    .innerJoin(courses, eq(lessons.course_id, courses.id))
    .where(and(
      eq(userLessonProgress.user_id, userId),
      eq(courses.language_code, String(lang)),
      eq(userLessonProgress.is_completed, false),
      // NEW: Added a 0 total_unique_words check to identify empty/invalid lessons, 
      // but otherwise, we stop auto-completing based on word counts.
      sql`1 = 0` // effectively disables this auto-completion for now.
    ));

    // Batch update them
    let updatedCount = 0;
    for (const c of candidates) {
      await db.update(userLessonProgress)
        .set({ is_completed: true })
        .where(eq(userLessonProgress.id, c.id));
      updatedCount++;
    }

    res.json({ success: true, updatedCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// 5b. Get Top 4 Recently Visited Lessons (Continue Studying)
router.get('/continue-studying', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { lang } = req.query;

    const recentLessons = await db.select({
      id: lessons.id,
      title: lessons.title,
      course_id: lessons.course_id,
      course_title: courses.title,
      image_url: lessons.image_url,
      unique_words: lessons.unique_words,
      user_new_words: userLessonProgress.new_words_count,
      is_completed: userLessonProgress.is_completed,
      last_read_at: userLessonProgress.last_read_at,
      owner_id: courses.owner_id,
    })
    .from(userLessonProgress)
    .innerJoin(lessons, eq(userLessonProgress.lesson_id, lessons.id))
    .innerJoin(courses, eq(lessons.course_id, courses.id))
    .where(and(
      eq(userLessonProgress.user_id, userId),
      eq(courses.language_code, String(lang)),
      sql`${userLessonProgress.last_read_at} IS NOT NULL`
    ))
    .orderBy(sql`${userLessonProgress.last_read_at} DESC`)
    .limit(4);

    res.json(recentLessons);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});


// 6. Fetch Guided Courses (with completion progress)
router.get('/guided-courses', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { lang, search } = req.query;
    const searchPattern = search ? `%${String(search).toLowerCase()}%` : null;

    const allCourses = await db.select({
      id: courses.id,
      title: courses.title,
      description: courses.description,
      image_url: courses.image_url,
      level: courses.level,
      owner_id: courses.owner_id,
      owner_username: users.username,
      is_enrolled: sql<boolean>`CASE WHEN ${userCourses.course_id} IS NOT NULL THEN 1 ELSE 0 END`
    })
    .from(courses)
    .leftJoin(users, eq(courses.owner_id, users.id))
    .leftJoin(userCourses, and(
      eq(userCourses.course_id, courses.id),
      eq(userCourses.user_id, userId)
    ))
    .where(and(
      eq(courses.language_code, String(lang)),
      searchPattern
        ? or(
            like(sql`lower(${courses.title})`, searchPattern),
            like(sql`lower(${courses.description})`, searchPattern)
          )
        : sql`1=1`
    ));

    const courseStats = await Promise.all(allCourses.map(async (course) => {
      const courseLessons = await db.select({
        id: lessons.id,
        unique_words: lessons.unique_words,
        duration: lessons.duration
      }).from(lessons).where(eq(lessons.course_id, course.id));

      // Get progress for all lessons the user has started in this course
      const progressRows = await db.select({
        is_completed: userLessonProgress.is_completed,
        new_words_count: userLessonProgress.new_words_count,
        lingqs_count: userLessonProgress.lingqs_count,
      })
      .from(userLessonProgress)
      .innerJoin(lessons, eq(userLessonProgress.lesson_id, lessons.id))
      .where(and(
        eq(lessons.course_id, course.id),
        eq(userLessonProgress.user_id, userId)
      ));

      const totalUnique = courseLessons.reduce((acc, l) => acc + (l.unique_words || 0), 0);
      const totalDuration = courseLessons.reduce((acc, l) => acc + (l.duration || 0), 0);
      const completedCount = progressRows.filter(p => p.is_completed).length;

      // Per-lesson aggregation
      const perLessonProgress = await db.select({
        lesson_id: userLessonProgress.lesson_id,
        new_words_count: userLessonProgress.new_words_count,
        lingqs_count: userLessonProgress.lingqs_count,
      })
      .from(userLessonProgress)
      .innerJoin(lessons, eq(userLessonProgress.lesson_id, lessons.id))
      .where(and(
        eq(lessons.course_id, course.id),
        eq(userLessonProgress.user_id, userId)
      ));

      // Map lesson id → progress
      const progressMap = new Map(perLessonProgress.map(p => [p.lesson_id, p]));

      const missingLessonIds = courseLessons.filter(l => !progressMap.has(l.id)).map(l => l.id);
      const initializedProgressMap = await initializeMissingProgress(userId, String(lang), missingLessonIds);

      let courseBlueRemaining = 0;
      let courseLingqs = 0;
      for (const lesson of courseLessons) {
        let p = progressMap.get(lesson.id);
        if (!p) {
           p = initializedProgressMap.get(lesson.id);
        }
        courseBlueRemaining += p ? (p.new_words_count ?? 0) : (lesson.unique_words ?? 0);
        courseLingqs += p ? (p.lingqs_count ?? 0) : 0;
      }

      const courseCompletionPct = courseLessons.length > 0
        ? Math.round((completedCount / courseLessons.length) * 100)
        : 0;

      const blueRemainingPct = totalUnique > 0
        ? Math.round((courseBlueRemaining / totalUnique) * 100)
        : 0;

      return {
        ...course,
        lesson_count: courseLessons.length,
        total_unique_words: totalUnique,
        completed_lessons: completedCount,
        completion_pct: courseCompletionPct,
        blue_remaining: courseBlueRemaining,
        blue_remaining_pct: blueRemainingPct,
        total_lingqs_count: courseLingqs,
        total_duration: totalDuration,
      };
    }));

    res.json(courseStats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// Helper: Dynamically calculates and stores user lesson progress for completely fresh/unopened lessons
async function initializeMissingProgress(userId: string, languageCode: string, missingLessonIds: string[]) {
    if (missingLessonIds.length === 0) return new Map();

    const userVocab = await db.select({
        word: masterVocab.original_word,
        stage: userVocabRelation.stage
    })
    .from(userVocabRelation)
    .innerJoin(masterVocab, eq(userVocabRelation.master_word_id, masterVocab.id))
    .where(and(
        eq(userVocabRelation.user_id, userId),
        eq(masterVocab.language_code, languageCode)
    ));

    const vocabMap = new Map(userVocab.map(v => [v.word, v.stage]));
    const contents = await db.select().from(lessonContent).where(inArray(lessonContent.lesson_id, missingLessonIds));

    const newProgressRows = [];
    for (const content of contents) {
        let tokens;
        try { tokens = JSON.parse(content.raw_text); } catch { continue; }
        
        const uniqueWords = new Set<string>();
        for (const t of tokens) if (t.isLearnable) uniqueWords.add(t.text.toLowerCase());

        let newWords = uniqueWords.size;
        let lingqs = 0;
        let known = 0;

        for (const word of uniqueWords) {
            const stage = vocabMap.get(word);
            if (stage !== undefined && stage !== null) {
               if (stage >= 1 && stage <= 4) { lingqs++; newWords--; }
               else if (stage === 5 || stage === 6) { known++; newWords--; }
            }
        }

        newProgressRows.push({
            user_id: userId,
            lesson_id: content.lesson_id,
            new_words_count: newWords,
            lingqs_count: lingqs,
            known_words_count: known,
            is_completed: false, // NEW: No longer auto-completing on initialization
            is_bookmarked: false
        });
    }

    if (newProgressRows.length > 0) {
        await db.insert(userLessonProgress).values(newProgressRows).onConflictDoNothing();
    }
    
    return new Map(newProgressRows.map(r => [r.lesson_id, r]));
}

// 7. Fetch Lessons for a Specific Course
router.get('/courses/:id/lessons', authenticate, async (req: AuthRequest, res) => {
  try {
    const courseId = req.params!.id;
    const userId = req.user!.id;

    if (typeof courseId !== 'string')
      return res.status(400).json({ message: 'Course ID is invalid!' });

    const [courseDetails] = await db.select({
      course: courses,
      owner_username: users.username
    })
    .from(courses)
    .leftJoin(users, eq(courses.owner_id, users.id))
    .where(eq(courses.id, String(courseId)))
    .limit(1);

    if (!courseDetails) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const courseLessons = await db.select({
      id: lessons.id,
      title: lessons.title,
      image_url: lessons.image_url,
      unique_words: lessons.unique_words,
      duration: lessons.duration,
      user_new_words: userLessonProgress.new_words_count,
      user_lingqs: userLessonProgress.lingqs_count,
      is_completed: userLessonProgress.is_completed,
      is_bookmarked: userLessonProgress.is_bookmarked,
    })
    .from(lessons)
    .leftJoin(userLessonProgress, and(
      eq(userLessonProgress.lesson_id, lessons.id),
      eq(userLessonProgress.user_id, userId)
    ))
    .where(eq(lessons.course_id, String(courseId)));

    // Calculate progress for unseen/missing setup lessons immediately
    const missingLessonIds = courseLessons.filter(l => l.user_new_words === null).map(l => l.id);
    const initializedProgressMap = await initializeMissingProgress(userId, courseDetails.course.language_code, missingLessonIds);

    const normalizedLessons = courseLessons.map(l => {
      let new_words = l.user_new_words;
      let lingqs = l.user_lingqs ?? 0;
      let completed = l.is_completed ?? false;
      
      if (new_words === null) {
         const p = initializedProgressMap.get(l.id);
         if (p) {
             new_words = p.new_words_count;
             lingqs = p.lingqs_count;
             completed = p.is_completed;
         }
      }

      return {
        ...l,
        course_title: courseDetails.course?.title,
        course_level: courseDetails.course?.level,
        owner_id: courseDetails.course?.owner_id,
        user_new_words: new_words !== null ? new_words : l.unique_words,
        user_lingqs: lingqs,
        is_completed: completed,
        is_bookmarked: l.is_bookmarked ?? false,
      };
    });

    // Compute course-level sidebar stats
    const totalUnique = courseLessons.reduce((acc, l) => acc + (l.unique_words || 0), 0);
    const totalDuration = courseLessons.reduce((acc, l) => acc + (l.duration || 0), 0);
    const completedCount = normalizedLessons.filter(l => l.is_completed).length;
    const completionPct = courseLessons.length > 0
      ? Math.round((completedCount / courseLessons.length) * 100)
      : 0;
    const courseBlueRemaining = normalizedLessons.reduce((acc, l) => acc + (l.user_new_words || 0), 0);
    const blueRemainingPct = totalUnique > 0
      ? Math.round((courseBlueRemaining / totalUnique) * 100)
      : 0;
    const totalLingqs = normalizedLessons.reduce((acc, l) => acc + (l.user_lingqs || 0), 0);

    res.json({
      course: {
        ...courseDetails.course,
        owner_username: courseDetails.owner_username || 'LingQ',
        lesson_count: courseLessons.length,
        total_unique_words: totalUnique,
        completed_lessons: completedCount,
        completion_pct: completionPct,
        blue_remaining: courseBlueRemaining,
        blue_remaining_pct: blueRemainingPct,
        total_lingqs: totalLingqs,
        total_duration: totalDuration,
      },
      lessons: normalizedLessons,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// 8. Toggle Lesson Bookmark (replaces course bookmark)
router.post('/lessons/:id/bookmark', authenticate, async (req: AuthRequest, res) => {
  try {
    const lessonId = req.params.id!.toString();
    const userId = req.user!.id;

    // Find or create a progress row for this lesson
    const [existing] = await db.select().from(userLessonProgress)
      .where(and(
        eq(userLessonProgress.lesson_id, lessonId),
        eq(userLessonProgress.user_id, userId)
      ));

    if (existing) {
      // Toggle the bookmark
      const newBookmarked = !existing.is_bookmarked;
      await db.update(userLessonProgress)
        .set({ is_bookmarked: newBookmarked })
        .where(eq(userLessonProgress.id, existing.id));
      res.json({ bookmarked: newBookmarked });
    } else {
      // Create a progress row with bookmark = true
      await db.insert(userLessonProgress).values({
        user_id: userId,
        lesson_id: lessonId,
        is_bookmarked: true,
        new_words_count: 0,
        lingqs_count: 0,
        known_words_count: 0,
      });
      res.json({ bookmarked: true });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// 9. Get already imported LingQ IDs and daily quota
router.get('/lingq-imported-ids', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const lang = req.query.lang as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const imported = await db.select({ lingq_id: lessons.lingq_id })
      .from(lessons)
      .innerJoin(courses, eq(lessons.course_id, courses.id))
      .where(and(eq(courses.owner_id, userId), isNotNull(lessons.lingq_id)));

    const ids = imported.map(row => row.lingq_id);
    
    let importedToday = 0;
    if (lang) {
      const [userLang] = await db.select().from(userLanguages).where(and(
        eq(userLanguages.user_id, userId),
        eq(userLanguages.language_code, lang)
      ));
      
      const now = new Date();
      importedToday = userLang?.lingq_lessons_imported_today || 0;
      const lastImportDate = userLang?.last_lingq_import_date;
      if (lastImportDate) {
        const isSameDay = lastImportDate.getUTCFullYear() === now.getUTCFullYear() &&
                          lastImportDate.getUTCMonth() === now.getUTCMonth() &&
                          lastImportDate.getUTCDate() === now.getUTCDate();
        if (!isSameDay) {
          importedToday = 0;
        }
      }
    }

    res.json({ importedIds: ids, importedToday, maxQuota: 10 });
  } catch (error: any) {
    console.error('Error fetching imported LingQ IDs:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10. Fetch Recommended Courses from LingQ
router.get('/lingq-courses', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const lingqApiKey = req.headers['x-lingq-apikey'] as string | undefined;

    const reqLang = req.query.lang as string | undefined;
    let languageCode = reqLang;

    if (!languageCode) {
      const [userLang] = await db.select()
        .from(userLanguages)
        .where(eq(userLanguages.user_id, userId))
        .limit(1);
      languageCode = userLang?.language_code || 'es';
    }

    const courses = await LingqImportService.fetchRecommendedCourses(lingqApiKey, languageCode);
    res.json(courses);
  } catch (error: any) {
    console.error('Error fetching LingQ courses:', error);
    res.status(500).json({ error: error.message });
  }
});

// 11. Fetch Course Lessons from LingQ
router.get('/lingq-lessons', authenticate, async (req: AuthRequest, res) => {
  try {
    const { lang, apiKey, courseId } = req.query;
    if (!lang || !courseId) return res.status(400).json({ error: "Missing language or course ID." });
    
    const result = await LingqImportService.fetchCourseLessons(apiKey as string, String(lang), String(courseId));
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// 12. Import Selected Lessons from LingQ
router.post('/lingq-import-selected', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { apiKey, languageCode, selectedLessons } = req.body;
    const targetLang = languageCode || 'en';

    if (!selectedLessons || !Array.isArray(selectedLessons) || selectedLessons.length === 0) {
      return res.status(400).json({ error: "No lessons selected." });
    }

    if (selectedLessons.length > 10) {
      return res.status(400).json({ error: "Cannot import more than 10 lessons at once." });
    }

    // Check daily limit
    const [userLang] = await db.select().from(userLanguages).where(and(
      eq(userLanguages.user_id, userId),
      eq(userLanguages.language_code, targetLang)
    ));

    const now = new Date();
    let importedToday = userLang?.lingq_lessons_imported_today || 0;
    const lastImportDate = userLang?.last_lingq_import_date;

    // Reset if it's a new day (UTC)
    if (lastImportDate) {
      const isSameDay = lastImportDate.getUTCFullYear() === now.getUTCFullYear() &&
                        lastImportDate.getUTCMonth() === now.getUTCMonth() &&
                        lastImportDate.getUTCDate() === now.getUTCDate();
      if (!isSameDay) {
        importedToday = 0;
      }
    }

    if (importedToday + selectedLessons.length > 10) {
      const remaining = 10 - importedToday;
      
      let langName = targetLang;
      try {
        langName = new Intl.DisplayNames(['en'], { type: 'language' }).of(targetLang) || targetLang;
      } catch (e) {
        // Fallback
      }

      return res.status(429).json({ error: `Daily quota of 10 imports exceeded. You can only import ${remaining} more lessons today for ${langName}.` });
    }

    // Process Import
    const result = await LingqImportService.importSelectedLessons(
      apiKey,
      userId,
      targetLang,
      selectedLessons
    );

    // Update daily limit tracking
    const newImportedToday = importedToday + selectedLessons.length;
    
    if (userLang) {
       await db.update(userLanguages)
         .set({ lingq_lessons_imported_today: newImportedToday, last_lingq_import_date: now })
         .where(and(eq(userLanguages.user_id, userId), eq(userLanguages.language_code, targetLang)));
    } else {
       await db.insert(userLanguages)
         .values({
           user_id: userId,
           language_code: targetLang,
           lingq_lessons_imported_today: newImportedToday,
           last_lingq_import_date: now
         });
    }

    res.json(result);
  } catch (error: unknown) {
    console.error("LingQ Import Selected Error:", error);
    res.status(500).json({ error: (error as { message?: string }).message || "Internal Error" });
  }
});

// 13. Fetch LingQ lesson translation — served from the global translation cache when
// available (populated at import time), otherwise fetched from LingQ once and cached for everyone.
router.get('/lingq-translation/:lessonId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { lessonId } = req.params;

    const result = await LingqImportService.fetchAndCacheTranslationForLesson(String(lessonId));

    if (!result) {
      return res.status(404).json({ error: 'Translation unavailable for this lesson.' });
    }

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Error';
    res.status(500).json({ error: message });
  }
});

export default router;