import { db, sqlite } from './index.js';
import { vocabTransitions } from './schema.js';
import { sql, lt } from 'drizzle-orm';

async function fix() {
    console.log("Starting timestamp fix: scaling 10-digit (seconds) to 13-digit (milliseconds)...");

    // 1. Identification: threshold for 10-digit unix timestamps in 2026 is around 1.7e9.
    // Milliseconds in 2026 is around 1.7e12.
    // Threshold of 100,000,000,000 is safe to distinguish 10 vs 13 digits.
    const THRESHOLD = 100000000000;

    // Use raw better-sqlite3 for precision update if needed, but Drizzle is fine here.
    const rows = (sqlite as any).prepare('SELECT id, created_at FROM vocab_transitions WHERE created_at > ?').all(THRESHOLD);

    console.log(`Found ${rows.length} rows with 13-digit timestamps.`);

    let count = 0;
    for (const row of rows) {
        const newTimestamp = row.created_at / 1000;
        (sqlite as any).prepare('UPDATE vocab_transitions SET created_at = ? WHERE id = ?').run(newTimestamp, row.id);
        count++;
    }

    console.log(`Successfully fixed ${count} rows.`);
    process.exit(0);
}

fix().catch(err => {
    console.error("Fix failed:", err);
    process.exit(1);
});
