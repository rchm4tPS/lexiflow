import { db } from './index.js';
import { languages } from './schema.js';

async function seed() {
  console.log('🌱 Seeding database...');
  try {
    // Known RTL language codes
    const rtlCodes = new Set(['ar', 'fa', 'he', 'ur']);

    // Fetch from LingQ API v2
    const response = await fetch('https://www.lingq.com/api/v2/languages/');
    if (!response.ok) {
      throw new Error(`Failed to fetch LingQ API: ${response.statusText}`);
    }

    const apiLanguages = await response.json();
    
    // Map API data to our schema format
    const languagesToInsert = apiLanguages.map((lang: any) => ({
      code: lang.code,
      name: lang.title,
      is_RTL: rtlCodes.has(lang.code)
    }));

    await db.insert(languages).values(languagesToInsert).onConflictDoNothing();

    // Add more seeding here as needed for MVP 1 stabilization
    // (e.g., default courses, phrases, etc.)
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();