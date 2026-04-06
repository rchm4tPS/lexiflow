import { db } from '../db/index.js';
import { vocabTransitions, phraseTransitions } from '../db/schema.js';

export class VocabHistoryService {
  /**
   * Logs a transition between stages for a given word and user.
   */
  static async logTransition(userId: string, masterWordId: string, oldStage: number, newStage: number) {
    if (oldStage === newStage) return;
    
    // Aligned with Phrase logic: Discovery (0 -> *) is tracked by created_at in user_vocab_relation.
    if (oldStage === 0) return;

    try {
      await db.insert(vocabTransitions).values({
        user_id: userId,
        master_word_id: masterWordId,
        old_stage: oldStage,
        new_stage: newStage,
        created_at: new Date()
      });
    } catch (error) {
      console.error('Failed to log vocab transition:', error);
    }
  }

  /**
   * Logs a transition between stages for a given phrase and user.
   */
  static async logPhraseTransition(userId: string, phraseId: string, oldStage: number, newStage: number) {
    if (oldStage === newStage) return;

    // Aligned logic: Discovery (0 -> *) is tracked by created_at in user_phrases.
    if (oldStage === 0) return;

    try {
      await db.insert(phraseTransitions).values({
        user_id: userId,
        phrase_id: phraseId,
        old_stage: oldStage,
        new_stage: newStage,
        created_at: new Date()
      });
    } catch (error) {
      console.error('Failed to log phrase transition:', error);
    }
  }
}
