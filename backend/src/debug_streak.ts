import { db } from './db/index.js';
import { streaks, userLanguages, users } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import { updateDailyStatsAndStreak } from './utils/statsEngine.js';

async function runDebug() {
  console.log("--- STREAK DEBUG START ---");
  
  const testUserId = "debug-user-" + Date.now();
  const lang = "en";

  // 1. Setup User
  await db.insert(users).values({
    id: testUserId,
    email: `${testUserId}@example.com`,
    username: testUserId,
    password_hash: "none"
  });

  await db.insert(userLanguages).values({
    user_id: testUserId,
    language_code: lang,
    daily_goal_tier: 'calm' // Goals: 5 LingQs, 11m (660s) Listening
  });

  // 2. Setup YESTERDAY'S fulfillment
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayMidnight = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  console.log("Setting up yesterday's streak record...");
  await db.insert(streaks).values({
    user_id: testUserId,
    language_code: lang,
    current_streak: 1,
    last_activity_date: yesterdayMidnight
  });

  // 3. Trigger TODAY'S fulfillment
  console.log("\nTriggering today's fulfillment (First half: LingQs)...");
  await updateDailyStatsAndStreak(testUserId, lang, { lingqsCreated: 10 });
  
  const [check1] = await db.select().from(streaks).where(and(eq(streaks.user_id, testUserId), eq(streaks.language_code, lang)));
  console.log(`Current Streak After LingQs: ${check1?.current_streak} (Expected: 1, because listening is missing)`);

  console.log("\nTriggering today's fulfillment (Second half: Listening)...");
  await updateDailyStatsAndStreak(testUserId, lang, { listeningSec: 700 });

  const [check2] = await db.select().from(streaks).where(and(eq(streaks.user_id, testUserId), eq(streaks.language_code, lang)));
  console.log(`Current Streak After Listening: ${check2?.current_streak} (Expected: 2)`);

  if (check2?.current_streak === 2) {
    console.log("\nSUCCESS: Streak incremented correctly!");
  } else {
    console.error("\nFAILURE: Streak did NOT increment correctly!");
  }

  // Cleanup
  // await db.delete(streaks).where(eq(streaks.user_id, testUserId));
  // await db.delete(userLanguages).where(eq(userLanguages.user_id, testUserId));
  // await db.delete(users).where(eq(users.id, testUserId));

  console.log("\n--- STREAK DEBUG END ---");
  process.exit();
}

runDebug().catch(console.error);
