import { Router } from 'express';
import { db } from '../db/index.js';
import { userPhrases, users, userLanguages } from '../db/schema.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { updateDailyStatsAndStreak } from '../utils/statsEngine.js';
import { VocabHistoryService } from '../services/vocabHistory.service.js';

const router = Router();

router.get('/list', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { lang, page = '1', limit = '25', search = '', sortBy = 'desc' } = req.query;

    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = and(
      eq(userPhrases.user_id, userId),
      eq(userPhrases.language_code, String(lang))
    );

    if (search) {
      whereClause = and(
        whereClause,
        sql`LOWER(${userPhrases.phrase_text}) LIKE ${`%${String(search).toLowerCase().trim()}%`}`
      );
    }

    let orderClause;
    switch (String(sortBy)) {
      case 'alphabetical_asc':
      case 'asc':
        orderClause = userPhrases.phrase_text;
        break;
      case 'alphabetical_desc':
      case 'desc':
        orderClause = sql`${userPhrases.phrase_text} DESC`;
        break;
      case 'last_reviewed_asc':
        orderClause = userPhrases.last_reviewed;
        break;
      case 'last_reviewed_desc':
        orderClause = sql`${userPhrases.last_reviewed} DESC`;
        break;
      case 'stage_asc':
        orderClause = userPhrases.stage;
        break;
      case 'stage_desc':
        orderClause = sql`${userPhrases.stage} DESC`;
        break;
      default:
        orderClause = sql`${userPhrases.phrase_text} DESC`;
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(userPhrases)
      .where(whereClause);
      
    const total = countResult!.count;

    const myPhrases = await db.select({
      id: userPhrases.id,
      phrase_text: userPhrases.phrase_text,
      user_meaning: userPhrases.user_meaning,
      stage: userPhrases.stage,
      phrase_tags: userPhrases.phrase_tags,
      notes: userPhrases.notes,
      related_phrase_occur: userPhrases.related_phrase_occur,
      last_reviewed: userPhrases.last_reviewed
    })
    .from(userPhrases)
    .where(whereClause)
    .orderBy(orderClause)
    .limit(limitNum)
    .offset(offset);

    res.json({
      data: myPhrases.map(item => ({
        ...item,
        word: item.phrase_text, // Add alias so VocabularyView can reuse mapping blindly if needed
        meaning: item.user_meaning, 
        word_tags: item.phrase_tags ? item.phrase_tags.split(',') :[]
      })),
      total
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a user phrase (store phrase text + meaning + stage)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { phrase_text, user_meaning, language_code, related_phrase_occur, notes } = req.body;
    const userId = req.user!.id;
    const newId = randomUUID();

    if (!phrase_text || !language_code) return res.status(400).json({ error: 'Missing phrase_text or language_code' });

    // Insert the phrase, update user coins, and bump language stats sequentially
    const [newPhrase] = await db.insert(userPhrases).values({
      id: newId,
      user_id: userId,
      language_code,
      phrase_text: phrase_text.toLowerCase(),
      user_meaning: user_meaning || '',
      stage: 1,
      notes: notes || null,
      related_phrase_occur: related_phrase_occur || null,
      created_at: new Date()
    }).returning();

    await db.update(users)
      .set({ total_coins: sql`MAX(0, ${users.total_coins} + 5)` })
      .where(eq(users.id, userId));
    
    const [existingLang] = await db.select().from(userLanguages)
      .where(and(eq(userLanguages.user_id, userId), eq(userLanguages.language_code, language_code)));

    if (existingLang) {
        await db.update(userLanguages)
            .set({ total_lingqs: (existingLang.total_lingqs || 0) + 1 })
            .where(and(eq(userLanguages.user_id, userId), eq(userLanguages.language_code, language_code)));
    } else {
        await db.insert(userLanguages)
            .values({
                user_id: userId,
                language_code: language_code,
                total_lingqs: 1,
                daily_goal_tier: 'calm'
            })
            .onConflictDoUpdate({
                target: [userLanguages.user_id, userLanguages.language_code],
                set: { total_lingqs: sql`${userLanguages.total_lingqs} + 1` }
            });
    }
    
    // Telemetry: Update Daily Stats (LingQs Created)
    await updateDailyStatsAndStreak(userId, language_code, { lingqsCreated: 1 });

    const [newP] = await db.select().from(userPhrases).where(eq(userPhrases.id, newId));
    res.json({ success: true, phrase: newP });
    
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: Update phrase stage/meaning
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { stage, user_meaning, wordTags, related_phrase_occur, notes } = req.body;
    const userId = req.user!.id;
    const phraseIdRaw = req.params.id;
    if (typeof phraseIdRaw !== 'string') return res.status(400).json({ error: 'Invalid phrase id' });
    const phraseId = phraseIdRaw;

    const updatePayload: any = { stage, last_reviewed: new Date() };
    if (user_meaning !== undefined) updatePayload.user_meaning = user_meaning;
    if (notes !== undefined) updatePayload.notes = notes;
    
    if (wordTags !== undefined) {
      const formattedTags = Array.isArray(wordTags) && wordTags.length > 0 
        ? wordTags.map((t: any) => String(t).toLowerCase().replace(/\s+/g, '_')).join(',') 
        : null;
      updatePayload.phrase_tags = formattedTags;
    }

    if (related_phrase_occur !== undefined) {
        updatePayload.related_phrase_occur = stage === 6 ? null : related_phrase_occur;
    }

    // Telemetry logic: Check for Mastery graduation (stage < 5 -> stage 5)
    // We need to fetch the existing phrase to get the language_code and original stage
    const [existing] = await db.select().from(userPhrases)
      .where(and(eq(userPhrases.id, phraseId), eq(userPhrases.user_id, userId)));

    if (!existing) return res.status(404).json({ error: 'Phrase not found' });

    const oldStage = Number(existing.stage) || 0;
    const newStage = Number(stage);
    
    const knownDelta = ((oldStage < 5 || oldStage === 6) && newStage === 5) 
      ? 1 
      : ((oldStage === 5 && (newStage < 5 || newStage === 6))
        ? -1 
        : 0
      );

    await db.update(userPhrases)
      .set(updatePayload)
      .where(and(eq(userPhrases.id, phraseId), eq(userPhrases.user_id, userId)));

    if (knownDelta !== 0) {
      // Update Language Stats (Total Known)
      await db.update(userLanguages)
        .set({ total_known_words: sql`MAX(0, ${userLanguages.total_known_words} + ${knownDelta})` })
        .where(and(eq(userLanguages.user_id, userId), eq(userLanguages.language_code, existing.language_code)));

      // Update Daily Stats (LingQs Learned)
      await updateDailyStatsAndStreak(userId, existing.language_code, { lingqsLearned: knownDelta });
    }

    // NEW: Log phrase transition
    await VocabHistoryService.logPhraseTransition(userId, phraseId, oldStage, newStage);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batch delete phrases
router.delete('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Missing or invalid ids array" });
    }

    await db.delete(userPhrases)
       .where(and(
         eq(userPhrases.user_id, userId),
         inArray(userPhrases.id, ids)
       ));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
