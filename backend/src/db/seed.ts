import { db } from './index.js';
import { languages } from './schema.js';

async function seed() {
  console.log('🌱 Seeding database...');
  try {
    await db.insert(languages).values([
      { code: 'en', name: 'English' },
      { code: 'de', name: 'German' },
      { code: 'fa', name: 'Persian', is_RTL: true },
      { code: 'es', name: 'Spanish' }
    ]).onConflictDoNothing(); // Prevent error if they already exist

    console.log('✅ Languages seeded successfully!');

    // Add more seeding here as needed for MVP 1 stabilization
    // (e.g., default courses, phrases, etc.)
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();