import { db } from '../db/index.js';
import { streaks, userDailyStats, userLanguages } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getTier } from '../constants/tiers.js';

export async function updateDailyStatsAndStreak(userId: string, languageCode: string, stats: { lingqsCreated?: number, lingqsLearned?: number, wordsRead?: number, listeningSec?: number }) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Using a synchronous transaction for better-sqlite3
  db.transaction((tx) => {
    // 1. UPDATE DAILY STATS
    const [existingDaily] = tx.select().from(userDailyStats)
      .where(and(
        eq(userDailyStats.user_id, userId),
        eq(userDailyStats.language_code, languageCode),
        eq(userDailyStats.log_date, today)
      )).all();

    const lingqsCreated = stats.lingqsCreated ?? 0;
    const lingqsLearned = stats.lingqsLearned ?? 0;
    const wordsRead = stats.wordsRead ?? 0;
    const listeningSec = stats.listeningSec ?? 0;

    if (existingDaily) {
      tx.update(userDailyStats).set({
        lingqs_created: sql`MAX(0, ${userDailyStats.lingqs_created} + ${lingqsCreated})`,
        lingqs_learned: sql`MAX(0, ${userDailyStats.lingqs_learned} + ${lingqsLearned})`,
        words_read: sql`MAX(0, ${userDailyStats.words_read} + ${wordsRead})`,
        listening_sec: sql`MAX(0, ${userDailyStats.listening_sec} + ${listeningSec})`,
      }).where(eq(userDailyStats.id, existingDaily.id)).run();
    } else {
      tx.insert(userDailyStats).values({
        user_id: userId, language_code: languageCode, log_date: today,
        lingqs_created: Math.max(0, lingqsCreated),
        lingqs_learned: Math.max(0, lingqsLearned),
        words_read: wordsRead,
        listening_sec: listeningSec
      }).run();
    }

    // 2. UPDATE STREAK (Fulfillment-based)
    const [langRecord] = tx.select().from(userLanguages)
      .where(and(eq(userLanguages.user_id, userId), eq(userLanguages.language_code, languageCode))).all();

    if (!langRecord) return; 

    const tier = getTier(langRecord.daily_goal_tier);

    // Fetch refreshed today's stats for accurate threshold checking
    const [freshDaily] = tx.select().from(userDailyStats)
      .where(and(
        eq(userDailyStats.user_id, userId),
        eq(userDailyStats.language_code, languageCode),
        eq(userDailyStats.log_date, today)
      )).all();

    const currentLingqs = freshDaily?.lingqs_created || 0;
    const currentListeningSec = freshDaily?.listening_sec || 0;

    const fulfilledLingq = currentLingqs >= tier.lingqGoal;
    const fulfilledListening = currentListeningSec >= (tier.listenMinGoal * 60);
    const isFulfilledToday = fulfilledLingq && fulfilledListening;

    if (isFulfilledToday) {
      console.log(`[StreakDebug] User ${userId} (${languageCode}) fulfilled today's goal.`);
      const [streakRecord] = tx.select().from(streaks)
        .where(and(eq(streaks.user_id, userId), eq(streaks.language_code, languageCode))).all();

      const nowTime = new Date();
      
      if (!streakRecord) {
        console.log(`[StreakDebug] No streak record found. Creating first streak.`);
        tx.insert(streaks).values({
          user_id: userId, language_code: languageCode, current_streak: 1, last_activity_date: nowTime
        }).run();
      } else {
        const lastFulfillment = new Date(streakRecord.last_activity_date || 0);
        const lastFulfillmentMidnight = new Date(lastFulfillment.getFullYear(), lastFulfillment.getMonth(), lastFulfillment.getDate());
        
        const diffTime = today.getTime() - lastFulfillmentMidnight.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        console.log(`[StreakDebug] Existing streak: ${streakRecord.current_streak || 0}, Last Fulfillment: ${lastFulfillmentMidnight.toISOString()}, Diff Days: ${diffDays}`);

        // THE FIX: If streak is 0, we MUST increment it to 1 regardless of diffDays.
        // If diffDays is 0 and streak > 0, we already incremented today, so skip.
        if (diffDays === 0 && (streakRecord.current_streak || 0) > 0) {
          console.log(`[StreakDebug] Already incremented today. Updating timestamp only.`);
          const [result] = tx.update(streaks).set({ last_activity_date: nowTime })
            .where(and(eq(streaks.user_id, userId), eq(streaks.language_code, languageCode)))
            .returning({ current_streak: streaks.current_streak }).all();
          console.log(`[StreakDebug] DB Returned Streak: ${result?.current_streak}`);
        } else if (diffDays === 1) {
          console.log(`[StreakDebug] Fulfilled yesterday! Incrementing streak to ${(streakRecord.current_streak || 0) + 1}`);
          const [result] = tx.update(streaks)
            .set({ current_streak: (streakRecord.current_streak || 0) + 1, last_activity_date: nowTime })
            .where(and(eq(streaks.user_id, userId), eq(streaks.language_code, languageCode)))
            .returning({ current_streak: streaks.current_streak }).all();
          console.log(`[StreakDebug] DB Returned Streak: ${result?.current_streak}`);
        } else {
          // This handles: streak is 0, OR missed yesterday (diffDays > 1)
          console.log(`[StreakDebug] Starting/Resetting streak to 1.`);
          const [result] = tx.update(streaks)
            .set({ current_streak: 1, last_activity_date: nowTime })
            .where(and(eq(streaks.user_id, userId), eq(streaks.language_code, languageCode)))
            .returning({ current_streak: streaks.current_streak }).all();
          console.log(`[StreakDebug] DB Returned Streak: ${result?.current_streak}`);
        }
      }
    } else {
      console.log(`[StreakDebug] User ${userId} (${languageCode}) not yet fulfilled today. (LingQs: ${currentLingqs}, Listening: ${currentListeningSec}s)`);
    }
  });
}