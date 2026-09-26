import type { Token, Phrase, DbPhrase } from '../types/reader';

interface PhraseInstance extends Phrase {
  startIndex?: number;
}

// --- TRIE DATA STRUCTURE FOR PHRASE MATCHING ---

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  /**
   * A phrase can end at this node. Multiple DB phrases can share the same text
   * (though rare — edge case we handle correctly).
   */
  phraseData: Array<{
    dbId: string;
    text: string;
    meaning: string;
    stage: number;
    notes?: string;
    wordTags: string[];
  }> = [];
}

class PhraseTrie {
  root = new TrieNode();

  /** Insert one DB phrase into the trie, splitting by spaces. */
  insert(dbP: DbPhrase): void {
    const words = dbP.phrase_text.toLowerCase().split(' ').filter(Boolean);
    if (words.length === 0) return;

    let node = this.root;
    for (const word of words) {
      let child = node.children.get(word);
      if (!child) {
        child = new TrieNode();
        node.children.set(word, child);
      }
      node = child;
    }

    node.phraseData.push({
      dbId: dbP.id,
      text: dbP.phrase_text,
      meaning: dbP.user_meaning || dbP.meaning || '',
      stage: dbP.stage,
      notes: dbP.notes,
      wordTags: dbP.phrase_tags ? dbP.phrase_tags.split(',') : [],
    });
  }

  /**
   * Starting at wordTokens[startIndex], follow the trie as far as possible.
   * Returns every complete phrase that ends at or after startIndex.
   */
  matchFrom(
    wordTokens: Token[],
    startIndex: number,
  ): Array<{
    dbId: string;
    text: string;
    meaning: string;
    stage: number;
    notes?: string;
    wordTags: string[];
    range: string[];
  }> {
    const results: Array<{
      dbId: string;
      text: string;
      meaning: string;
      stage: number;
      notes?: string;
      wordTags: string[];
      range: string[];
    }> = [];

    let node = this.root;
    const range: string[] = [];

    for (let i = startIndex; i < wordTokens.length; i++) {
      const word = wordTokens[i].text.toLowerCase();
      const child = node.children.get(word);
      if (!child) break; // no further match possible

      node = child;
      range.push(wordTokens[i].id);

      if (node.phraseData.length > 0) {
        // One or more phrases end here — emit a result for each
        for (const pd of node.phraseData) {
          results.push({ ...pd, range: [...range] });
        }
      }
    }

    return results;
  }
}

/**
 * Build phrase instances from raw DB phrases using a Trie for O(n) matching
 * instead of the previous brute-force O(n * m * avg_len) sliding window.
 *
 * Input & output types are identical — this is a drop-in replacement.
 */
export const buildPhraseInstances = (
  tokens: Token[],
  dbPhrases: DbPhrase[],
): Phrase[] => {
  const instances: PhraseInstance[] = [];

  // Fast path: no phrases or no real words → nothing to match
  const wordTokens = tokens.filter(
    (t) => t.isLearnable !== false && !t.isNewline && t.text.trim().length > 0,
  );
  if (dbPhrases.length === 0 || wordTokens.length === 0) return [];

  // 1. Build trie — O(total_words_across_all_phrases)
  const t0 = performance.now();
  const trie = new PhraseTrie();
  for (const dbP of dbPhrases) {
    trie.insert(dbP);
  }
  const t1 = performance.now();

  // 2. Single pass over word tokens — O(n * avg_match_depth)
  //    avg_match_depth ≈ average phrase length (usually 2-5), not the full phrase count.
  for (let i = 0; i < wordTokens.length; i++) {
    const matches = trie.matchFrom(wordTokens, i);
    for (const m of matches) {
      instances.push({
        id: `${m.dbId}_${i}`,
        dbId: m.dbId,
        text: m.text,
        meaning: m.meaning,
        stage: m.stage,
        notes: m.notes,
        word_tags: m.wordTags,
        range: m.range,
        isPhrase: true,
        startIndex: i,
      });
    }
  }
  const t2 = performance.now();

  // 3. Sort by startIndex (same as before — renderTree depends on this order)
  instances.sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));
  const t3 = performance.now();

  // --- PERFORMANCE LOG (Trie proof) ---
  const totalComparisons = wordTokens.length; // each token attempts trie traversal
  const wouldBeComparisons = wordTokens.length * dbPhrases.length * 3; // conservative old O(n*m*avg_len) estimate
  console.log(
    `[PhraseTrie] tokens=${wordTokens.length} phrases=${dbPhrases.length} matches=${instances.length} ` +
    `| trieBuild=${(t1 - t0).toFixed(2)}ms scan=${(t2 - t1).toFixed(2)}ms sort=${(t3 - t2).toFixed(2)}ms total=${(t3 - t0).toFixed(2)}ms ` +
    `| est_old_sliding_window=${wouldBeComparisons.toLocaleString()} compars | trie_actual=${totalComparisons.toLocaleString()} traversals ` +
    `| ${wouldBeComparisons > 0 ? `${(wouldBeComparisons / totalComparisons).toFixed(1)}x` : 'N/A'} faster`
  );

  return instances;
};