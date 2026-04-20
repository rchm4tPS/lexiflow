import { Router } from 'express';
import { db } from '../db/index.js';
import { userVocabRelation, masterVocab, users, userLanguages, userPhrases } from '../db/schema.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { eq, and, sql, inArray } from 'drizzle-orm';
import axios from 'axios';
import { externalHintsCache } from '../db/schema.js';
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

    // Build conditional logic
    let whereClause = and(
      eq(userVocabRelation.user_id, userId),
      eq(masterVocab.language_code, String(lang)),
      eq(userVocabRelation.is_ignored_initially, false)
    );

    if (search) {
      whereClause = and(
        whereClause,
        sql`LOWER(${masterVocab.original_word}) LIKE ${`%${String(search).toLowerCase().trim()}%`}`
      );
    }

    let orderClause;
    switch (String(sortBy)) {
      case 'alphabetical_asc':
      case 'asc':
        orderClause = masterVocab.original_word;
        break;
      case 'alphabetical_desc':
      case 'desc':
        orderClause = sql`${masterVocab.original_word} DESC`;
        break;
      case 'last_reviewed_asc':
        orderClause = userVocabRelation.last_reviewed;
        break;
      case 'last_reviewed_desc':
        orderClause = sql`${userVocabRelation.last_reviewed} DESC`;
        break;
      case 'stage_asc':
        orderClause = userVocabRelation.stage;
        break;
      case 'stage_desc':
        orderClause = sql`${userVocabRelation.stage} DESC`;
        break;
      default:
        orderClause = sql`${masterVocab.original_word} DESC`;
    }

    // Get Total Count
    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(userVocabRelation)
      .innerJoin(masterVocab, eq(userVocabRelation.master_word_id, masterVocab.id))
      .where(whereClause);
      
    const total = countResult!.count;

    const myVocab = await db.select({
      id: userVocabRelation.id,
      word: masterVocab.original_word,
      meaning: userVocabRelation.user_meaning,
      stage: userVocabRelation.stage,
      word_tag: userVocabRelation.word_tag,
      related_phrase_occur: userVocabRelation.related_phrase_occur,
      last_reviewed: userVocabRelation.last_reviewed
    })
    .from(userVocabRelation)
    .innerJoin(masterVocab, eq(userVocabRelation.master_word_id, masterVocab.id))
    .where(whereClause)
    .orderBy(orderClause)
    .limit(limitNum)
    .offset(offset);

    res.json({
        data: myVocab.map(item => ({
            ...item,
            word_tags: item.word_tag ? item.word_tag.split(',') : []
        })),
        total
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

router.post('/upsert', authenticate, async (req: AuthRequest, res) => {
  try {
    const { wordText, stage: newStage, meaning, languageCode, 
      // coinDelta, 
      isIgnoredInitially, wordTags, related_phrase_occur, notes
      // knownDelta, lingqDelta 
    } = req.body;
    const userId = req.user!.id;

    // ENFORCE TAG RULES: Lowercase, replace spaces with underscores, null if empty
    const formattedTags = Array.isArray(wordTags) && wordTags.length > 0 
        ? wordTags.map(t => String(t).toLowerCase().replace(/\s+/g, '_')).join(',') 
        : null;

    // 1. Ensure the word exists in Master Vocab
    let [masterWord] = await db.select().from(masterVocab)
      .where(and(eq(masterVocab.original_word, wordText.toLowerCase()), eq(masterVocab.language_code, languageCode)));

    if (!masterWord) {
      [masterWord] = await db.insert(masterVocab).values({
        original_word: wordText.toLowerCase(),
        language_code: languageCode
      }).returning();
    }

    // 2. Check if user already has a relation
    const [existing] = await db.select().from(userVocabRelation)
      .innerJoin(masterVocab, eq(userVocabRelation.master_word_id, masterVocab.id))
      .where(and(
        eq(userVocabRelation.user_id, userId),
        eq(userVocabRelation.master_word_id, masterWord!.id)
      ));

    // LOGIC: A word is a LingQ only if it moves from 0 to 1, 2, 3, or 4.
    const oldStage = existing ? (existing.user_vocab_relation.stage || 0) : 0;
    const wasIgnored = existing ? existing.user_vocab_relation.is_ignored_initially : false;

    // 2. Business Rules: Coin Values
    const coinMap: Record<number, number> = { 0: 0, 1: 5, 2: 7, 3: 9, 4: 11, 5: 15, 6: 0 };
    
    // If it was ignored initially, it's "cursed" and never yields coins
    const oldCoinValue = wasIgnored ? 0 : (coinMap[oldStage] || 0);
    const newCoinValue = (wasIgnored || newStage === 6) ? 0 : (coinMap[newStage] || 0);
    
    let finalContext = related_phrase_occur !== undefined ? related_phrase_occur : (existing ? existing.user_vocab_relation.related_phrase_occur : null);
    if (newStage === 6) finalContext = null;
    
    const coinDelta = newCoinValue - oldCoinValue;

    // 3. Business Rules: Stats Deltas
    // knownDelta: +1 if graduating to 5, -1 if demoting from 5. Bounded.
    const knownDelta = ((oldStage < 5 || oldStage === 6) && newStage === 5) 
      ? 1 
      : ((oldStage === 5 && (newStage < 5 || newStage === 6))
        ? -1 
        : 0
        );
    
    // lingqDelta: +1 only when first created (0 -> 1-5), never -1 (because you said can't un-lingq)
    const lingqDelta = (oldStage === 0 && newStage >= 1 && newStage <= 5) ? 1 : 0;

    // const becameLingq = oldStage === 0 && stage >= 1 && stage <= 4;
    
    // If it was ALREADY created as a LingQ in the past, keep it true. Otherwise, evaluate it now.
    // const finalCreatedAsLingq = existing ? (existing.user_vocab_relation.created_as_lingq || becameLingq) : becameLingq;

    if (existing) {
      await db.update(userVocabRelation)
        .set({ stage: newStage, user_meaning: meaning, 
          is_ignored_initially: isIgnoredInitially, 
          created_as_lingq: existing.user_vocab_relation.created_as_lingq,
          word_tag: formattedTags,
          notes: notes !== undefined ? notes : existing.user_vocab_relation.notes,
          related_phrase_occur: finalContext,
          last_reviewed: new Date() 
        })
        .where(and(
          eq(userVocabRelation.master_word_id, masterWord!.id),
          eq(userVocabRelation.user_id, userId)
        ));
    } else {
      await db.insert(userVocabRelation).values({
        user_id: userId,
        master_word_id: masterWord!.id,
        stage: newStage,
        user_meaning: meaning, is_ignored_initially: isIgnoredInitially,
        created_as_lingq: lingqDelta === 1 ? true : false,
        word_tag: formattedTags,
        notes: notes || null,
        related_phrase_occur: finalContext
      });
    }

    // --- MARKOV LOGGING ---
    await VocabHistoryService.logTransition(userId, masterWord!.id, oldStage, newStage);


    if (coinDelta !== 0) {
      await db.update(users)
        .set({ total_coins: sql`MAX(0, ${users.total_coins} + ${coinDelta})` })
        .where(eq(users.id, userId));
    }

    // 2. Update Language Stats (Known words & LingQs)
    if (knownDelta !== 0 || (lingqDelta !== 0)) {
      await db.insert(userLanguages)
        .values({
          user_id: userId,
          language_code: languageCode,
          total_known_words: Math.max(0, knownDelta || 0),
          total_lingqs: Math.max(0, lingqDelta || 0),
          daily_goal_tier: 'calm'
        })
        .onConflictDoUpdate({
          target:[userLanguages.user_id, userLanguages.language_code],
          set: { 
            total_known_words: sql`MAX(0, ${userLanguages.total_known_words} + ${knownDelta || 0})`,
            total_lingqs: sql`MAX(0, ${userLanguages.total_lingqs} + ${lingqDelta || 0})`
          }
        });
    }

    if (!wasIgnored) {
      const tzOffset = req.headers['x-timezone-offset'] as string | undefined;
      await updateDailyStatsAndStreak(userId, languageCode, {
        lingqsCreated: lingqDelta,
        lingqsLearned: knownDelta
      }, tzOffset);
    }

    res.json({ success: true, coinDelta });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});


router.post('/batch-upsert', authenticate, async (req: AuthRequest, res) => {
  try {
    const { words, stage, languageCode, coinDeltaTotal, knownDeltaTotal } = req.body;
    const userId = req.user!.id;

    for (const payload of words) {
      const wordText = typeof payload === 'string' ? payload : payload.word;
      const finalContext = payload.context || null;

      // 1. Ensure Master Word exists
      let [masterWord] = await db.select().from(masterVocab)
        .where(and(eq(masterVocab.original_word, wordText.toLowerCase()), eq(masterVocab.language_code, languageCode)));

      if (!masterWord) {
        [masterWord] = await db.insert(masterVocab).values({
          original_word: wordText.toLowerCase(), language_code: languageCode
        }).returning();
      }

      // 2. Upsert User Relation
      const [existing] = await db.select().from(userVocabRelation)
        .where(and(eq(userVocabRelation.user_id, userId), eq(userVocabRelation.master_word_id, masterWord!.id)));

      const oldStage = existing ? (existing.stage || 0) : 0;
      const becameLingq = oldStage === 0 && stage >= 1 && stage <= 4;
      const finalCreatedAsLingq = existing ? (existing.created_as_lingq || becameLingq) : becameLingq;

      if (existing) {
        await db.update(userVocabRelation).set({ stage, created_as_lingq: finalCreatedAsLingq, related_phrase_occur: finalContext || existing.related_phrase_occur, last_reviewed: new Date() })
          .where(eq(userVocabRelation.id, existing.id));
      } else {
        await db.insert(userVocabRelation).values({
          user_id: userId, master_word_id: masterWord!.id, stage, created_as_lingq: finalCreatedAsLingq, related_phrase_occur: finalContext
        });
      }

      // --- MARKOV LOGGING (Batch) ---
      await VocabHistoryService.logTransition(userId, masterWord!.id, oldStage, stage);

    }


    db.run(sql`UPDATE users SET total_coins = MAX(0, total_coins + ${coinDeltaTotal}) WHERE id = ${userId}`);

    await db.insert(userLanguages)
      .values({ 
          user_id: userId, language_code: languageCode, 
          total_known_words: knownDeltaTotal, daily_goal_tier: 'calm' 
      })
      .onConflictDoUpdate({
        target: [userLanguages.user_id, userLanguages.language_code],
        set: { total_known_words: sql`MAX(0, ${userLanguages.total_known_words} + ${knownDeltaTotal})` }
      });

    const tzOffset = req.headers['x-timezone-offset'] as string | undefined;
    await updateDailyStatsAndStreak(userId, languageCode, {
      lingqsCreated: 0,
      lingqsLearned: knownDeltaTotal
    }, tzOffset);

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// if you manually delete a word in your database, just trigger this endpoint 
// via Postman or a hidden dev-button on the frontend, and your UI will 
// instantly fix itself!
router.post('/recalculate-stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { languageCode } = req.body;

    // 1. Fetch ALL vocabulary relations for this user and language
    const allVocab = await db.select({
      stage: userVocabRelation.stage,
      isIgnored: userVocabRelation.is_ignored_initially,
      createdAsLingq: userVocabRelation.created_as_lingq
    })
    .from(userVocabRelation)
    .innerJoin(masterVocab, eq(userVocabRelation.master_word_id, masterVocab.id))
    .where(and(
      eq(userVocabRelation.user_id, userId),
      eq(masterVocab.language_code, languageCode)
    ));

    // 2. Fetch Phrases (All phrases are inherently LingQs)
    const allPhrases = await db.select({ stage: userPhrases.stage })
      .from(userPhrases)
      .where(and(eq(userPhrases.user_id, userId), eq(userPhrases.language_code, languageCode)));

    let trueCoins = 0;
    let trueKnown = 0;
    let trueLingqs = allPhrases.length; // Start trueLingqs with total phrases;

    const coinValues: Record<number, number> = { 0: 0, 1: 5, 2: 7, 3: 9, 4: 11, 5: 15, 6: 0 };

    // Calculate Word Stats
    for (const word of allVocab) {
      if (!word.isIgnored) {
        trueCoins += coinValues[word.stage || 0] || 0;
      }

      if (word.stage === 5) trueKnown++;

      // The crucial LingQ definition logic:
      if (
        word.stage && word.stage >= 1 
          && word.stage <= 5 
          && word.createdAsLingq
      ) trueLingqs++;
    }

    // Add Phrase Coins (Assuming all phrases granted 5 coins)
    // You could expand this if phrases have stages that grant more coins
    trueCoins += (allPhrases.length * 5); 

    // 3. Update the Database with the absolute truth
    await db.update(users)
      .set({ total_coins: trueCoins })
      .where(eq(users.id, userId));

    await db.update(userLanguages)
      .set({ total_known_words: trueKnown, total_lingqs: trueLingqs })
      .where(and(eq(userLanguages.user_id, userId), eq(userLanguages.language_code, languageCode)));

    res.json({ success: true, trueCoins, trueKnown, trueLingqs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

router.get('/hints', authenticate, async (req: AuthRequest, res) => {
  const { word, lang } = req.query;
  if (!word || !lang) return res.status(400).json({ error: "Missing params" });

  try {
    // 1. Check SQLite Cache
    const [cached] = await db.select().from(externalHintsCache)
      .where(and(
        eq(externalHintsCache.word, String(word).toLowerCase()),
        eq(externalHintsCache.language_code, String(lang))
      ));

    // If cache is younger than 30 days, return it
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    if (cached && (Date.now() - ( cached.last_updated?.getTime() ?? Date.now() ) < THIRTY_DAYS)) {
      return res.json(JSON.parse(cached.hints_json));
    }

    // 2. Not in cache -> Fetch from LingQ
    const LINGQ_API_KEY = process.env.LINGQ_TOKEN; 

    if (!LINGQ_API_KEY) {
      return res.status(500).json({ error: "Missing LingQ Token" });
    }

    const response = await axios.get(`https://www.lingq.com/api/languages/${lang}/hints/`, {
      params: { word },
      headers: { 'Authorization': `Token ${LINGQ_API_KEY}` }
    });

    const hints = response.data[String(word)] || [];

    // 3. Save to Cache for future requests
    await db.insert(externalHintsCache).values({
      word: String(word).toLowerCase(),
      language_code: String(lang),
      hints_json: JSON.stringify(hints),
      last_updated: new Date()
    }).onConflictDoUpdate({
      target: [externalHintsCache.word, externalHintsCache.language_code],
      set: { hints_json: JSON.stringify(hints), last_updated: new Date() }
    });

    res.json(hints);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    console.error("Hints Error:", message);
    res.status(500).json({ error: "Failed to fetch hints" });
  }
});

// Fetch all unique tags used by this user for autocomplete caching
router.get('/tags', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { lang } = req.query;

    const tagsRecords = await db.selectDistinct({ tag: userVocabRelation.word_tag })
      .from(userVocabRelation)
      .innerJoin(masterVocab, eq(userVocabRelation.master_word_id, masterVocab.id))
      .where(and(
        eq(userVocabRelation.user_id, userId),
        eq(masterVocab.language_code, String(lang)),
        sql`${userVocabRelation.word_tag} IS NOT NULL`
      ));

    const phraseTagsRecords = await db.selectDistinct({ tag: userPhrases.phrase_tags })
      .from(userPhrases)
      .where(and(
        eq(userPhrases.user_id, userId),
        eq(userPhrases.language_code, String(lang)),
        sql`${userPhrases.phrase_tags} IS NOT NULL`
      ));

    // Split the comma-separated strings to get individual unique tags
    const uniqueTags = new Set<string>();
    
    tagsRecords.forEach(record => {
        if (record.tag) {
            record.tag.split(',').forEach((t: string) => uniqueTags.add(t));
        }
    });

    phraseTagsRecords.forEach(record => {
        if (record.tag) {
            record.tag.split(',').forEach((t: string) => uniqueTags.add(t));
        }
    });

    res.json(Array.from(uniqueTags));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

// Batch delete
router.delete('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Missing or invalid ids array" });
    }

    await db.delete(userVocabRelation)
       .where(and(
         eq(userVocabRelation.user_id, userId),
         inArray(userVocabRelation.id, ids)
       ));

    // Stats recalculate handled on frontend action logic or simple inline query
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

import { LearningAnalyticsService } from '../services/learningAnalytics.service.js';

router.get('/insights', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { lang } = req.query;
    if (!lang) return res.status(400).json({ error: "Missing lang parameter" });

    const matrix = await LearningAnalyticsService.calculateUserMatrix(userId, String(lang));
    const discoveryVelocity = await LearningAnalyticsService.calculateDiscoveryVelocity(userId, String(lang));

    if (!matrix) {
      return res.json({ 
        message: "Not enough data for Markov analysis. Keep reading!",
        discoveryVelocity 
      });
    }

    const stationary = LearningAnalyticsService.computeStationaryDistribution(matrix);

    res.json({
      matrix,
      stationary,
      discoveryVelocity,
      healthScore: stationary.steady_mastery * 100, // Normalized 0-100 score of long-term retention
      burnoutIndex: stationary.filtered_proportion * 100 // Proportion of "Ignored" in long term
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    res.status(500).json({ error: message });
  }
});

export default router;