import { db } from '../db/index.js';
import { streaks, userDailyStats, userLanguages } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getTier } from '../constants/tiers.js';
import { getUserMidnight } from './timezone.js';

export async function updateDailyStatsAndStreak(userId: string, languageCode: string, stats: { lingqsCreated?: number, lingqsLearned?: number, wordsRead?: number, listeningSec?: number }, tzOffset?: string | number | null) {
  const today = getUserMidnight(tzOffset);

  await db.transaction(async (tx) => {
    // 1. UPDATE DAILY STATS
    const dailyRows = await tx.select().from(userDailyStats)
      .where(and(
        eq(userDailyStats.user_id, userId),
        eq(userDailyStats.language_code, languageCode),
        eq(userDailyStats.log_date, today)
      ));
    const existingDaily = dailyRows[0];

    const lingqsCreated = stats.lingqsCreated ?? 0;
    const lingqsLearned = stats.lingqsLearned ?? 0;
    const wordsRead = stats.wordsRead ?? 0;
    const listeningSec = stats.listeningSec ?? 0;

    if (existingDaily) {
      await tx.update(userDailyStats).set({
        lingqs_created: sql`MAX(0, ${userDailyStats.lingqs_created} + ${lingqsCreated})`,
        lingqs_learned: sql`MAX(0, ${userDailyStats.lingqs_learned} + ${lingqsLearned})`,
        words_read: sql`MAX(0, ${userDailyStats.words_read} + ${wordsRead})`,
        listening_sec: sql`MAX(0, ${userDailyStats.listening_sec} + ${listeningSec})`,
      }).where(eq(userDailyStats.id, existingDaily.id));
    } else {
      await tx.insert(userDailyStats).values({
        user_id: userId, language_code: languageCode, log_date: today,
        lingqs_created: Math.max(0, lingqsCreated),
        lingqs_learned: Math.max(0, lingqsLearned),
        words_read: wordsRead,
        listening_sec: listeningSec
      });
    }

    // 2. UPDATE STREAK (Fulfillment-based)
    const langRows = await tx.select().from(userLanguages)
      .where(and(eq(userLanguages.user_id, userId), eq(userLanguages.language_code, languageCode)));
    const langRecord = langRows[0];

    if (!langRecord) return; 

    const tier = getTier(langRecord.daily_goal_tier);

    // Fetch refreshed today's stats for accurate threshold checking
    const freshRows = await tx.select().from(userDailyStats)
      .where(and(
        eq(userDailyStats.user_id, userId),
        eq(userDailyStats.language_code, languageCode),
        eq(userDailyStats.log_date, today)
      ));
    const freshDaily = freshRows[0];

    const currentLingqs = freshDaily?.lingqs_created || 0;
    const currentListeningSec = freshDaily?.listening_sec || 0;

    const fulfilledLingq = currentLingqs >= tier.lingqGoal;
    const fulfilledListening = currentListeningSec >= (tier.listenMinGoal * 60);

    const isFulfilledToday = fulfilledLingq && fulfilledListening;

    if (isFulfilledToday) {
      console.log(`[StreakDebug] User ${userId} (${languageCode}) fulfilled today's goal.`);
      const streakRows = await tx.select().from(streaks)
        .where(and(eq(streaks.user_id, userId), eq(streaks.language_code, languageCode)));
      const streakRecord = streakRows[0];

      const nowTime = new Date();
      
      if (!streakRecord) {
        console.log(`[StreakDebug] No streak record found. Creating first streak.`);
        await tx.insert(streaks).values({
          user_id: userId, language_code: languageCode, current_streak: 1, last_activity_date: nowTime
        });
      } else {
        const lastFulfillment = new Date(streakRecord.last_activity_date || 0);
        // Shift last-fulfillment into user's local day, then snap back to that midnight UTC
        const lastFulfillmentDayMs = lastFulfillment.getTime() - ((Number(tzOffset) || 0) * 60 * 1000);
        const lf = new Date(lastFulfillmentDayMs);
        const lastFulfillmentMidnightTz = new Date(Date.UTC(lf.getUTCFullYear(), lf.getUTCMonth(), lf.getUTCDate()) + ((Number(tzOffset) || 0) * 60 * 1000));
        
        const diffTime = today.getTime() - lastFulfillmentMidnightTz.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        console.log(`[StreakDebug] Existing streak: ${streakRecord.current_streak || 0}, Last Fulfillment: ${lastFulfillmentMidnightTz.toISOString()}, Diff Days: ${diffDays}`);

        if (diffDays === 0 && (streakRecord.current_streak || 0) > 0) {
          console.log(`[StreakDebug] Already incremented today. Updating timestamp only.`);
          const result = await tx.update(streaks).set({ last_activity_date: nowTime })
            .where(and(eq(streaks.user_id, userId), eq(streaks.language_code, languageCode)))
            .returning({ current_streak: streaks.current_streak });
          console.log(`[StreakDebug] DB Returned Streak: ${result[0]?.current_streak}`);
        } else if (diffDays === 1) {
          console.log(`[StreakDebug] Fulfilled yesterday! Incrementing streak to ${(streakRecord.current_streak || 0) + 1}`);
          const result = await tx.update(streaks)
            .set({ current_streak: (streakRecord.current_streak || 0) + 1, last_activity_date: nowTime })
            .where(and(eq(streaks.user_id, userId), eq(streaks.language_code, languageCode)))
            .returning({ current_streak: streaks.current_streak });
          console.log(`[StreakDebug] DB Returned Streak: ${result[0]?.current_streak}`);
        } else {
          console.log(`[StreakDebug] Starting/Resetting streak to 1.`);
          const result = await tx.update(streaks)
            .set({ current_streak: 1, last_activity_date: nowTime })
            .where(and(eq(streaks.user_id, userId), eq(streaks.language_code, languageCode)))
            .returning({ current_streak: streaks.current_streak });
          console.log(`[StreakDebug] DB Returned Streak: ${result[0]?.current_streak}`);
        }
      }
    } else {
      console.log(`[StreakDebug] User ${userId} (${languageCode}) not yet fulfilled today. (LingQs: ${currentLingqs}, Listening: ${currentListeningSec}s)`);
    }
  });
}