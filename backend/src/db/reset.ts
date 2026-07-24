import { db } from './index.js';
import { 
  users, 
  userLanguages, 
  streaks, 
  userDailyStats, 
  courses, 
  userCourses, 
  lessons, 
  lessonContent, 
  userLessonProgress, 
  masterVocab, 
  userVocabRelation, 
  userPhrases, 
  externalHintsCache, 
  vocabTransitions, 
  phraseTransitions 
} from './schema.js';

async function resetDatabase() {
  console.log("⚠️ WARNING: This will delete ALL data in the database (except languages)!");
  console.log("Starting cleanup...");

  try {
    // Delete in reverse-dependency order to be absolutely safe, 
    // even though ON DELETE CASCADE is configured.
    console.log("Deleting transitions...");
    await db.delete(phraseTransitions);
    await db.delete(vocabTransitions);

    console.log("Deleting lesson progress and content...");
    await db.delete(userLessonProgress);
    await db.delete(lessonContent);
    await db.delete(lessons);
    await db.delete(userCourses);
    await db.delete(courses);

    console.log("Deleting vocabulary and phrases...");
    await db.delete(userPhrases);
    await db.delete(userVocabRelation);
    await db.delete(masterVocab);

    console.log("Deleting user stats and profiles...");
    await db.delete(userDailyStats);
    await db.delete(streaks);
    await db.delete(userLanguages);
    await db.delete(externalHintsCache);

    console.log("Deleting users...");
    await db.delete(users);

    console.log("✅ Database reset complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    process.exit(1);
  }
}

// Allow passing a --confirm flag to bypass the prompt (useful for npm scripts if they want)
if (process.argv.includes('--confirm')) {
  resetDatabase();
} else {
  console.log("Run with `npm run db:reset -- --confirm` to actually execute this.");
  process.exit(0);
}
