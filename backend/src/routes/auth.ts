/**
 * This handles Registration and Login, interacting directly with Drizzle
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import {
  users, userLanguages, languages, streaks, userDailyStats,
  masterVocab, userVocabRelation, vocabTransitions,
  userPhrases, phraseTransitions,
  courses, lessons, lessonContent, userCourses, userLessonProgress
} from '../db/schema.js';
import { eq, and, sql, gte, inArray } from 'drizzle-orm';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const router = Router();
router.get('/verify', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const [row] = await db.select().from(users).where(eq(users.id, userId));
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      user: {
        id: row.id,
        username: row.username,
        email: row.email,
        fullName: row.fullname,
        preferences: row.preferences,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as { message?: string }).message || 'Internal Error' });
  }
});

router.get('/info/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId;
    if (typeof userId !== 'string')
      return res.status(400).json({ error: 'Invalid User ID!' });

    // 1. Determine target language first (URL param takes priority)
    const basicUser = await db.select({ preferences: users.preferences }).from(users).where(eq(users.id, userId));
    const preferences = basicUser[0]?.preferences;
    const targetLanguage = (req.query.lang as string) || preferences?.targetLanguage || 'en';

    // 2. Fetch user info AND correct RTL status for THIS specific language
    const userInfo = await db.select({
      fullname: users.fullname,
      username: users.username,
      total_coins: users.total_coins,
      preferences: users.preferences,
      isRTL: languages.is_RTL,
    })
      .from(users)
      .leftJoin(languages, eq(sql`${targetLanguage}`, languages.code))
      .where(eq(users.id, userId));

    const fullname = userInfo[0]?.fullname;
    const username = userInfo[0]?.username;
    const totalCoins = userInfo[0]?.total_coins;
    const isRTL = userInfo[0]?.isRTL ?? false;

    // Now fetch everything specifically for THIS language
    const userLanguageInfo = await db.select().from(userLanguages)
      .where(and(eq(userLanguages.user_id, userId), eq(userLanguages.language_code, targetLanguage)));

    const userStreakInfo = await db.select().from(streaks)
      .where(and(eq(streaks.user_id, userId), eq(streaks.language_code, targetLanguage)));

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const userDailyStatsInfo = await db.select().from(userDailyStats)
      .where(and(
        eq(userDailyStats.user_id, userId),
        eq(userDailyStats.language_code, targetLanguage),
        eq(userDailyStats.log_date, today)
      ));

    // Aggregate stats for 7d and 30d (Daily breakdown)
    const getStatsArray = async (days: number) => {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (days - 1));

      const dailyRecords = await db.select().from(userDailyStats)
        .where(and(
          eq(userDailyStats.user_id, userId),
          eq(userDailyStats.language_code, targetLanguage),
          gte(userDailyStats.log_date, startDate)
        ));

      const results = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        
        // Find matching record by date string comparison
        const record = dailyRecords.find(r => 
          new Date(r.log_date).toDateString() === d.toDateString()
        );

        results.push({
          date: d.toISOString(),
          created: Number(record?.lingqs_created || 0),
          learned: Number(record?.lingqs_learned || 0),
          listening: Number(record?.listening_sec || 0),
          words: Number(record?.words_read || 0),
        });
      }
      return results;
    };

    const [stats7d, stats30d] = await Promise.all([
      getStatsArray(7),
      getStatsArray(30)
    ]);

    const rawStreak = userStreakInfo[0]?.current_streak || 0;
    const lastFulfillment = userStreakInfo[0]?.last_activity_date ? new Date(userStreakInfo[0].last_activity_date) : null;
    let displayStreak = rawStreak;

    if (lastFulfillment) {
      const lastFullMidnight = new Date(lastFulfillment.getFullYear(), lastFulfillment.getMonth(), lastFulfillment.getDate());
      const diffTime = today.getTime() - lastFullMidnight.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // If last fulfillment was BEFORE yesterday, the streak is currently 0
      if (diffDays > 1) {
        displayStreak = 0;
      }
    } else {
      displayStreak = 0;
    }

    res.json({
      fullName: fullname,
      username,
      languageCode: targetLanguage,
      dailyGoalTier: userLanguageInfo[0]?.daily_goal_tier ?? 'calm',
      knownWords: userLanguageInfo[0]?.total_known_words || 0,
      totalLingQs: userLanguageInfo[0]?.total_lingqs || 0,
      totalCoins,
      totalStreaks: displayStreak,
      totalDailyLingqs: userDailyStatsInfo[0]?.lingqs_created || 0,
      totalDailyLingqsLearned: userDailyStatsInfo[0]?.lingqs_learned || 0,
      totalDailyListeningSec: userDailyStatsInfo[0]?.listening_sec || 0,
      totalDailyWordsRead: userDailyStatsInfo[0]?.words_read || 0,
      hasImportedFromLingq: userLanguageInfo[0]?.has_imported_from_lingq ?? false,
      isRTL,
      stats7d,
      stats30d
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(400).json({ error: message });
  }
})

router.post('/register', async (req, res) => {
  try {
    const { email, username, fullName, password, targetLanguage, dailyGoalTier } = req.body;

    if (!email || !username || !password || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Hash password outside the transaction (CPU-bound, not DB-bound)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Use Drizzle's db.transaction(tx) so all inserts share the same connection/transaction
    // context — without tx, Drizzle auto-commits each statement independently even inside
    // sqlite.transaction(), breaking atomicity. Use sync .all()/.run() (no await needed).
    db.transaction((tx) => {
      const [newUser] = tx.insert(users).values({
        email,
        username,
        fullname: fullName || '',
        preferences: { targetLanguage },
        password_hash: hashedPassword,
      }).returning({ id: users.id }).all();

      tx.insert(userLanguages).values({
        user_id: newUser!.id,
        language_code: targetLanguage,
        daily_goal_tier: dailyGoalTier || 'calm',
        total_known_words: 0,
        total_lingqs: 0,
      }).run();

      tx.insert(streaks).values({
        user_id: newUser!.id,
        language_code: targetLanguage,
        current_streak: 0,
      }).run();
    });

    res.json({ success: true, message: 'Account created! Please log in.' });
  } catch (error: unknown) {
    const err = error as { message?: string };
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email or username already taken.' });
    }
    if (err.message?.includes('FOREIGN KEY')) {
      return res.status(400).json({ error: `Language "${req.body.targetLanguage}" is not supported. Please choose a different one.` });
    }
    res.status(400).json({ error: err.message || "Internal Error" });
  }
});

router.patch('/goal-tier', authenticate, async (req: AuthRequest, res) => {
  try {
    const { tier } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!tier) return res.status(400).json({ error: 'Tier is required' });

    // We need to know which language to update. 
    // Usually, this should be the active language. 
    // For now, we update the first one found or we could expect languageCode in body.
    const { languageCode } = req.body;
    if (!languageCode) return res.status(400).json({ error: 'languageCode is required' });

    await db.update(userLanguages)
      .set({ daily_goal_tier: tier })
      .where(and(
        eq(userLanguages.user_id, userId),
        eq(userLanguages.language_code, languageCode)
      ));

    res.json({ success: true, tier });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as { message?: string }).message || "Internal Error" });
  }
});



router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const userResult = await db.select().from(users).where(eq(users.email, email));
    if (userResult.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userResult[0];

    // Verify password (assuming you added password_hash to schema)
    if (user) {
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

      // Generate Token
      const token = jwt.sign({ id: user?.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      res.json({ token, user: { id: user?.id, username: user?.username, email: user?.email, fullName: user?.fullname, preferences: user?.preferences } });
    }
  } catch (error: unknown) {
    res.status(500).json({ error: (error as { message?: string }).message || "Internal Error" });
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  try {
    // For JWT, logout is handled client-side by discarding the token
    // In a production app, you might want to implement token blacklisting
    res.json({ message: 'Logged out successfully' });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as { message?: string }).message || "Internal Error" });
  }
});

import { LearningAnalyticsService, type TransitionMatrix, type StationaryDistribution } from '../services/learningAnalytics.service.js';

router.get('/profile/insights/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId;
    if (typeof userId !== 'string')
      return res.status(400).json({ error: 'Invalid User ID!' });

    // 1. Get the user's active language
    const userInfo = await db.select({ preferences: users.preferences }).from(users).where(eq(users.id, userId));
    const targetLanguage = userInfo[0]?.preferences?.targetLanguage || 'en';

    // 2. Fetch Markov insights for Vocab
    const vocabMatrix = await LearningAnalyticsService.calculateUserMatrix(userId, targetLanguage, 'vocab');
    const vocabVelocity = await LearningAnalyticsService.calculateDiscoveryVelocity(userId, targetLanguage, 'vocab');

    interface InsightStats {
      hasInsights: boolean;
      discoveryVelocity: number;
      matrix?: TransitionMatrix;
      stationary?: StationaryDistribution;
      metrics?: unknown;
    }

    let vocabStats: InsightStats = { hasInsights: false, discoveryVelocity: vocabVelocity };
    if (vocabMatrix) {
      const stationary = LearningAnalyticsService.computeStationaryDistribution(vocabMatrix);
      vocabStats = {
        hasInsights: true,
        discoveryVelocity: vocabVelocity,
        matrix: vocabMatrix,
        stationary,
        metrics: LearningAnalyticsService.getUXMetrics(vocabMatrix, stationary)
      };
    }

    // 3. Fetch Markov insights for Phrases
    const phraseMatrix = await LearningAnalyticsService.calculateUserMatrix(userId, targetLanguage, 'phrase');
    const phraseVelocity = await LearningAnalyticsService.calculateDiscoveryVelocity(userId, targetLanguage, 'phrase');

    let phraseStats: InsightStats = { hasInsights: false, discoveryVelocity: phraseVelocity };
    if (phraseMatrix) {
      const stationary = LearningAnalyticsService.computeStationaryDistribution(phraseMatrix);
      phraseStats = {
        hasInsights: true,
        discoveryVelocity: phraseVelocity,
        matrix: phraseMatrix,
        stationary,
        metrics: LearningAnalyticsService.getUXMetrics(phraseMatrix, stationary)
      };
    }

    res.json({
      vocab: vocabStats,
      phrase: phraseStats
    });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as { message?: string }).message || "Internal Error" });
  }
});

router.post('/profile/reset/:languageCode', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { languageCode } = req.params;

    if (!languageCode) return res.status(400).json({ error: 'Language code is required' });

    // --- NUCLEAR RESET TRANSACTION ---
    db.transaction((tx) => {
      // 1. Reset Vocabulary (Filter by language_code in masterVocab)
      const wordIdsInLang = tx.select({ id: masterVocab.id })
        .from(masterVocab)
        .where(eq(masterVocab.language_code, String(languageCode)));

      tx.delete(vocabTransitions).where(and(
        eq(vocabTransitions.user_id, userId),
        inArray(vocabTransitions.master_word_id, wordIdsInLang)
      )).run();

      tx.delete(userVocabRelation).where(and(
        eq(userVocabRelation.user_id, userId),
        inArray(userVocabRelation.master_word_id, wordIdsInLang)
      )).run();

      // 2. Reset Phrases
      // Cleanup transition logs first (referencing userPhrases in this language)
      const phraseIdsInLang = tx.select({ id: userPhrases.id })
        .from(userPhrases)
        .where(and(
          eq(userPhrases.user_id, userId),
          eq(userPhrases.language_code, String(languageCode))
        ));

      tx.delete(phraseTransitions).where(and(
        eq(phraseTransitions.user_id, userId),
        inArray(phraseTransitions.phrase_id, phraseIdsInLang)
      )).run();

      tx.delete(userPhrases).where(and(
        eq(userPhrases.user_id, userId),
        eq(userPhrases.language_code, String(languageCode))
      )).run();

      // 3. Reset Lesson Progress & OWNED Courses
      const allCourseIdsInLang = tx.select({ id: courses.id })
        .from(courses)
        .where(eq(courses.language_code, String(languageCode)));

      const allLessonIdsInLang = tx.select({ id: lessons.id })
        .from(lessons)
        .where(inArray(lessons.course_id, allCourseIdsInLang));

      // FIRST: Un-enroll user from everything in this language
      tx.delete(userLessonProgress).where(and(
        eq(userLessonProgress.user_id, userId),
        inArray(userLessonProgress.lesson_id, allLessonIdsInLang)
      )).run();

      tx.delete(userCourses).where(and(
        eq(userCourses.user_id, userId),
        inArray(userCourses.course_id, allCourseIdsInLang)
      )).run();

      // SECOND: Destroy courses and lessons OWNED by the user in this language
      const ownedCourseIdsInLang = tx.select({ id: courses.id })
        .from(courses)
        .where(and(
          eq(courses.language_code, String(languageCode)),
          eq(courses.owner_id, userId)
        ));

      const ownedLessonIdsInLang = tx.select({ id: lessons.id })
        .from(lessons)
        .where(inArray(lessons.course_id, ownedCourseIdsInLang));

      // Cascading delete for owned content
      tx.delete(lessonContent).where(inArray(lessonContent.lesson_id, ownedLessonIdsInLang)).run();
      tx.delete(lessons).where(inArray(lessons.id, ownedLessonIdsInLang)).run();
      tx.delete(courses).where(inArray(courses.id, ownedCourseIdsInLang)).run();

      // 4. Reset Daily Stats & Streaks
      tx.delete(userDailyStats).where(and(
        eq(userDailyStats.user_id, userId),
        eq(userDailyStats.language_code, String(languageCode))
      )).run();

      tx.update(streaks).set({ current_streak: 0, last_activity_date: null }).where(and(
        eq(streaks.user_id, userId),
        eq(streaks.language_code, String(languageCode))
      )).run();

      tx.update(userLanguages).set({
        total_known_words: 0,
        total_lingqs: 0,
        has_imported_from_lingq: false
      }).where(and(
        eq(userLanguages.user_id, userId),
        eq(userLanguages.language_code, String(languageCode))
      )).run();
    });

    res.json({ success: true, message: `Reset all data for ${languageCode}.` });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as { message?: string }).message || "Internal Error" });
  }
});

router.get('/languages', async (req, res) => {
  try {
    const allLanguages = await db.select({
      code: languages.code,
      name: languages.name,
      isRTL: languages.is_RTL
    }).from(languages);
    res.json(allLanguages);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as { message?: string }).message || "Internal Error" });
  }
});

router.patch('/preferences', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { targetLanguage } = req.body;

    if (!targetLanguage) return res.status(400).json({ error: 'targetLanguage is required' });

    await db.update(users)
      .set({ preferences: { targetLanguage } })
      .where(eq(users.id, userId));

    res.json({ success: true, targetLanguage });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as { message?: string }).message || "Internal Error" });
  }
});

export default router;