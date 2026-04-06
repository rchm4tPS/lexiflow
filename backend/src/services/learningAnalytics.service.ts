import { db } from '../db/index.js';
import { vocabTransitions, masterVocab, phraseTransitions, userPhrases, userVocabRelation } from '../db/schema.js';
import { eq, and, sql, gte } from 'drizzle-orm';

const MIN_THRESHOLD = 50;

export interface TransitionMatrix {
  pLL: number; pLK: number; pLI: number;
  pKL: number; pKK: number; pKI: number;
  pIL: number; pIK: number; pII: number;
}

export interface StationaryDistribution {
  learning_load: number;       // piL
  steady_mastery: number;      // piK
  filtered_proportion: number; // piI
}

export class LearningAnalyticsService {
  /**
   * Calculates the empirical transition matrix P for a user in a specific language.
   * Focuses on states: Learning (1-4), Known (5)
   */

  static async calculateUserMatrix(userId: string, languageCode: string, type: 'vocab' | 'phrase' = 'vocab'): Promise<TransitionMatrix | null> {
    let logs: { old_stage: number; new_stage: number }[] = [];

    if (type === 'vocab') {
      logs = await db.select({
        old_stage: vocabTransitions.old_stage,
        new_stage: vocabTransitions.new_stage
      })
      .from(vocabTransitions)
      .innerJoin(masterVocab, eq(vocabTransitions.master_word_id, masterVocab.id))
      .where(and(
        eq(vocabTransitions.user_id, userId),
        eq(masterVocab.language_code, languageCode),
        gte(vocabTransitions.old_stage, 1),
        gte(vocabTransitions.new_stage, 1)
      ));
    } else {
      logs = await db.select({
        old_stage: phraseTransitions.old_stage,
        new_stage: phraseTransitions.new_stage
      })
      .from(phraseTransitions)
      .innerJoin(userPhrases, eq(phraseTransitions.phrase_id, userPhrases.id))
      .where(and(
        eq(phraseTransitions.user_id, userId),
        eq(userPhrases.language_code, languageCode),
        gte(phraseTransitions.old_stage, 1),
        gte(phraseTransitions.new_stage, 1)
      ));
    }
    
    if (logs.length < MIN_THRESHOLD) return null; // Not enough data for statistical significance

    const counts = {
      L: { L: 0, K: 0, I: 0 },
      K: { L: 0, K: 0, I: 0 },
      I: { L: 0, K: 0, I: 0 }
    };

    const getGroup = (stage: number) => {
      if (stage >= 1 && stage <= 4) return 'L';
      if (stage === 5) return 'K';
      if (stage === 6) return 'I';
      return null;
    };

    for (const log of logs) {
      const from = getGroup(log.old_stage);
      const to = getGroup(log.new_stage);
      if (from && to) {
        counts[from][to]++;
      }
    }

    // Step 3a: Adaptive Dirichlet/Laplace Smoothing
    const totalTransitions = logs.length;
    const alpha = Math.min(1, MIN_THRESHOLD / totalTransitions);

    const normalizeRow = (row: { L: number; K: number; I: number }) => {
      const rowSum = row.L + row.K + row.I;
      const denom = rowSum + (3 * alpha);
      return {
        L: (row.L + alpha) / denom,
        K: (row.K + alpha) / denom,
        I: (row.I + alpha) / denom
      };
    };

    const rowL = normalizeRow(counts.L);
    const rowK = normalizeRow(counts.K);
    const rowI = normalizeRow(counts.I);

    return {
      pLL: rowL.L, pLK: rowL.K, pLI: rowL.I,
      pKL: rowK.L, pKK: rowK.K, pKI: rowK.I,
      pIL: rowI.L, pIK: rowI.K, pII: rowI.I
    };
  }

  /**
   * Computes the stationary distribution pi using the iterative Power Method.
   * PI * P = PI
   */
  /**
   * Calculates "Learning Velocity": how many words per day are moving out of New (0).
   * Refined to exclude state 6 (Ignore) and adjust for account age.
   */
  static async calculateDiscoveryVelocity(userId: string, languageCode: string, type: 'vocab' | 'phrase' = 'vocab'): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let firstAtRaw: number;
    if (type === 'vocab') {
      const [firstVocabLog] = await db.select({
        at: sql<number>`MIN(${vocabTransitions.created_at})`
      })
      .from(vocabTransitions)
      .innerJoin(masterVocab, eq(vocabTransitions.master_word_id, masterVocab.id))
      .where(and(eq(vocabTransitions.user_id, userId), eq(masterVocab.language_code, languageCode)));
      
      const [firstVocabRelation] = await db.select({
        at: sql<number>`MIN(${userVocabRelation.created_at})`
      })
      .from(userVocabRelation)
      .innerJoin(masterVocab, eq(userVocabRelation.master_word_id, masterVocab.id))
      .where(and(eq(userVocabRelation.user_id, userId), eq(masterVocab.language_code, languageCode)));

      const lAt = firstVocabLog?.at;
      const rAt = firstVocabRelation?.at;
      if (lAt && rAt) firstAtRaw = Math.min(Number(lAt), Number(rAt));
      else firstAtRaw = Number(lAt || rAt || Date.now());
    } else {
      const [firstPhraseRecord] = await db.select({
        at: sql<number>`MIN(${userPhrases.created_at})`
      })
      .from(userPhrases)
      .where(and(eq(userPhrases.user_id, userId), eq(userPhrases.language_code, languageCode)));
      
      firstAtRaw = firstPhraseRecord?.at || Date.now();
    }

    // ROBUSTNESS: Scale 10-digit (seconds) to 13-digit (ms) if needed
    if (firstAtRaw < 100000000000) firstAtRaw *= 1000;

    const now = new Date();
    const firstDate = new Date(firstAtRaw);
    
    // Normalize both to LOCAL midnight
    const startOfToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const startOfFirst = new Date(Date.UTC(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate()));
    
    const diffMs = startOfToday.getTime() - startOfFirst.getTime();
    const activeDays = Math.min(
      30, 
      Math.max(
        1, 
        Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
    );

    // 2. Aggregate discovery counts
    if (type === 'vocab') {
      // Historical Word Discovery (Logs)
      // const [vocabLogRes] = await db.select({ count: sql<number>`count(*)` })
      // .from(vocabTransitions)
      // .innerJoin(masterVocab, eq(vocabTransitions.master_word_id, masterVocab.id))
      // .where(and(
      //   eq(vocabTransitions.user_id, userId),
      //   eq(masterVocab.language_code, languageCode),
      //   eq(vocabTransitions.old_stage, 0),
      //   sql`${vocabTransitions.new_stage} BETWEEN 1 AND 5`,
      //   sql`${vocabTransitions.created_at} >= ${thirtyDaysAgo.getTime() / 1000}`
      // ));

      // Modern Word Discovery (Relations)
      const [vocabRelRes] = await db.select({ count: sql<number>`count(*)` })
      .from(userVocabRelation)
      .innerJoin(masterVocab, eq(userVocabRelation.master_word_id, masterVocab.id))
      .where(and(
        eq(userVocabRelation.user_id, userId),
        eq(masterVocab.language_code, languageCode),
        sql`${userVocabRelation.stage} BETWEEN 1 AND 5`, // Exclude ignored (6) and new (0)
        sql`${userVocabRelation.created_at} >= ${thirtyDaysAgo.getTime() / 1000}`
      ));

      // Note: We might have a small overlap if someone discovered a word RIGHT as we changed logic, 
      // but it's negligible compared to the 30-day average.
      // const totalVocab = Number(vocabLogRes?.count || 0) + Number(vocabRelRes?.count || 0);
      const totalVocab = Number(vocabRelRes?.count || 0);
      return totalVocab / activeDays;
    } else {
      const [phraseRes] = await db.select({ count: sql<number>`count(*)` })
      .from(userPhrases)
      .where(and(
        eq(userPhrases.user_id, userId),
        eq(userPhrases.language_code, languageCode),
        sql`${userPhrases.created_at} >= ${thirtyDaysAgo.getTime() / 1000}`
      ));
      return (phraseRes?.count || 0) / activeDays;
    }
  }

  static computeStationaryDistribution(P: TransitionMatrix): StationaryDistribution {
    let piL = 0.33, piK = 0.33, piI = 0.34; // Initial guess
    const iterations = 50;

    for (let i = 0; i < iterations; i++) {
      const nextL = piL * P.pLL + piK * P.pKL + piI * P.pIL;
      const nextK = piL * P.pLK + piK * P.pKK + piI * P.pIK;
      const nextI = piL * P.pLI + piK * P.pKI + piI * P.pII;

      piL = nextL;
      piK = nextK;
      piI = nextI;

      const sum = piL + piK + piI;
      piL /= sum;
      piK /= sum;
      piI /= sum;
    }

    return { 
      learning_load: piL, 
      steady_mastery: piK, 
      filtered_proportion: piI 
    };
  }

  /**
   * Generates derived UX Metrics based on probabilities.
   */
  static getUXMetrics(P: TransitionMatrix, pi: StationaryDistribution) {
    return {
      learning_success_rate: P.pLK * 100,
      forgetting_rate: P.pKL * 100,
      learning_friction: P.pLL * 100,
      
      learning_load: pi.learning_load * 100,
      steady_mastery: pi.steady_mastery * 100,
      filtered_proportion: pi.filtered_proportion * 100
    };
  }
}
