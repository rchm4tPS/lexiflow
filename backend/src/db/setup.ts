import { client } from './index.js';

let ftsInitialized = false;

/**
 * One-time database setup: FTS5 virtual tables, triggers, and B-tree indexes.
 * Safe to call multiple times — all statements use IF NOT EXISTS.
 */
export async function setupDatabase(): Promise<void> {
  if (ftsInitialized) return;
  const t0 = performance.now();

  // ─── 1. FTS5 VIRTUAL TABLES ───
  // Standalone FTS5 (no content=), populated + synced via triggers.
  // unicode61 tokenizer normalizes case and handles Unicode (accents, non-Latin).

  await client.execute(`CREATE VIRTUAL TABLE IF NOT EXISTS master_vocab_fts USING fts5(
    original_word,
    id UNINDEXED,
    language_code UNINDEXED,
    tokenize='unicode61'
  )`);

  await client.execute(`CREATE VIRTUAL TABLE IF NOT EXISTS user_phrases_fts USING fts5(
    phrase_text,
    id UNINDEXED,
    tokenize='unicode61'
  )`);

  // ─── 2. TRIGGERS: master_vocab → master_vocab_fts ───

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS master_vocab_ai AFTER INSERT ON master_vocab BEGIN
      INSERT INTO master_vocab_fts(rowid, original_word, id, language_code)
      VALUES (new.rowid, new.original_word, new.id, new.language_code);
    END;
  `);

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS master_vocab_ad AFTER DELETE ON master_vocab BEGIN
      INSERT INTO master_vocab_fts(master_vocab_fts, rowid, original_word, id, language_code)
      VALUES ('delete', old.rowid, '', '', '');
    END;
  `);

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS master_vocab_au AFTER UPDATE ON master_vocab BEGIN
      INSERT INTO master_vocab_fts(master_vocab_fts, rowid, original_word, id, language_code)
      VALUES ('delete', old.rowid, '', '', '');
      INSERT INTO master_vocab_fts(rowid, original_word, id, language_code)
      VALUES (new.rowid, new.original_word, new.id, new.language_code);
    END;
  `);

  // ─── 3. TRIGGERS: user_phrases → user_phrases_fts ───

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS user_phrases_ai AFTER INSERT ON user_phrases BEGIN
      INSERT INTO user_phrases_fts(rowid, phrase_text, id)
      VALUES (new.rowid, new.phrase_text, new.id);
    END;
  `);

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS user_phrases_ad AFTER DELETE ON user_phrases BEGIN
      INSERT INTO user_phrases_fts(user_phrases_fts, rowid, phrase_text, id)
      VALUES ('delete', old.rowid, '', '');
    END;
  `);

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS user_phrases_au AFTER UPDATE ON user_phrases BEGIN
      INSERT INTO user_phrases_fts(user_phrases_fts, rowid, phrase_text, id)
      VALUES ('delete', old.rowid, '', '');
      INSERT INTO user_phrases_fts(rowid, phrase_text, id)
      VALUES (new.rowid, new.phrase_text, new.id);
    END;
  `);

  // ─── 4. POPULATE EXISTING DATA (idempotent via INSERT OR IGNORE) ───

  await client.execute(`
    INSERT OR IGNORE INTO master_vocab_fts(rowid, original_word, id, language_code)
    SELECT rowid, original_word, id, language_code FROM master_vocab
  `);

  await client.execute(`
    INSERT OR IGNORE INTO user_phrases_fts(rowid, phrase_text, id)
    SELECT rowid, phrase_text, id FROM user_phrases
  `);

  // ─── 5. B-TREE INDEXES (speed up non-search queries) ───

  // master_vocab: JOIN + language filter
  await client.execute('CREATE INDEX IF NOT EXISTS idx_master_vocab_lang ON master_vocab(language_code)');
  // user_vocab_relation: JOIN + user + ignored filter
  await client.execute('CREATE INDEX IF NOT EXISTS idx_uvr_user_id ON user_vocab_relation(user_id)');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_uvr_master_word ON user_vocab_relation(master_word_id)');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_uvr_user_ignored ON user_vocab_relation(user_id, is_ignored_initially)');
  // user_phrases: user + language filter
  await client.execute('CREATE INDEX IF NOT EXISTS idx_up_user_id ON user_phrases(user_id)');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_up_lang ON user_phrases(language_code)');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_up_user_lang ON user_phrases(user_id, language_code)');

  const t1 = performance.now();
  console.log(`[DB] FTS5 + indexes ready (${(t1 - t0).toFixed(1)}ms)`);
  ftsInitialized = true;
}
