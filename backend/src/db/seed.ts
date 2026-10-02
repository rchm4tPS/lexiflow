import { db } from './index.js';
import { languages } from './schema.js';

/** Shape of one entry from the LingQ languages endpoint. */
interface LingqApiLanguage {
  code: string;
  title: string;
}

/**
 * Minimum viable language set, used when the LingQ API cannot be reached.
 *
 * CI used to call `exit(1)` on a failed fetch, so a third-party outage — or a
 * rate limit — failed the whole pipeline for reasons unrelated to this code.
 * Falling back keeps the build deterministic and still records the failure.
 */
const FALLBACK_LANGUAGES: LingqApiLanguage[] = [
  { code: 'en', title: 'English' },
  { code: 'es', title: 'Spanish' },
  { code: 'fr', title: 'French' },
  { code: 'de', title: 'German' },
  { code: 'it', title: 'Italian' },
  { code: 'ja', title: 'Japanese' },
  { code: 'ko', title: 'Korean' },
  { code: 'ru', title: 'Russian' },
  { code: 'pt', title: 'Portuguese' },
  { code: 'ar', title: 'Arabic' },
  { code: 'nl', title: 'Dutch' },
  { code: 'tr', title: 'Turkish' },
];

async function fetchLanguages(): Promise<{ list: LingqApiLanguage[]; source: string }> {
  try {
    const response = await fetch('https://www.lingq.com/api/v2/languages/');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const apiLanguages = (await response.json()) as LingqApiLanguage[];
    if (!Array.isArray(apiLanguages) || apiLanguages.length === 0) {
      throw new Error('LingQ API returned an empty or malformed list');
    }

    return { list: apiLanguages, source: 'LingQ API' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  Could not read the LingQ API (${reason}); using the built-in fallback list.`);
    return { list: FALLBACK_LANGUAGES, source: 'built-in fallback' };
  }
}

async function seed() {
  console.log('🌱 Seeding database...');

  const rtlCodes = new Set(['ar', 'fa', 'he', 'ur']);
  const { list, source } = await fetchLanguages();

  const languagesToInsert = list.map((lang) => ({
    code: lang.code,
    name: lang.title,
    is_RTL: rtlCodes.has(lang.code),
  }));

  await db.insert(languages).values(languagesToInsert).onConflictDoNothing();

  console.log(`✅ Seeded ${languagesToInsert.length} languages from ${source}.`);
  // Add more seeding here as needed for MVP 1 stabilization
  // (e.g., default courses, phrases, etc.)
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    // Only a genuine database failure is fatal — a bad seed must not leave the
    // pipeline ambiguous about whether the app or the network was at fault.
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });