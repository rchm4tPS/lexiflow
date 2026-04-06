import { sqlite } from './index.js';

async function migrate() {
    console.log("Starting direct migration of vocab_transitions timestamps using better-sqlite3...");

    // 1. Use the raw sqlite instance to bypass Drizzle's type conversion
    const rows = (sqlite as any).prepare('SELECT id, created_at FROM vocab_transitions').all();

    let count = 0;
    for (const row of rows) {
        const rawValue = row.created_at;
        
        // If it's a string date 'YYYY-MM-DD HH:MM:SS'
        if (typeof rawValue === 'string' && rawValue.includes('-')) {
            // SQLite CURRENT_TIMESTAMP is 'YYYY-MM-DD HH:MM:SS' in UTC
            const dateObj = new Date(rawValue.replace(' ', 'T') + 'Z');
            const timestamp = dateObj.getTime();

            if (!isNaN(timestamp)) {
                // Update using raw SQL to be sure we store it as an integer
                (sqlite as any).prepare('UPDATE vocab_transitions SET created_at = ? WHERE id = ?').run(timestamp, row.id);
                count++;
                console.log(`Updated Row ID: ${row.id} from [${rawValue}] to [${timestamp}]`);
            } else {
                console.warn(`Could not parse date: ${rawValue}`);
            }
        } else {
            console.log(`Skipping Row ID: ${row.id}, rawValue: ${rawValue}, type: ${typeof rawValue}`);
        }
    }

    console.log(`Migration complete. Updated ${count} records.`);
    process.exit(0);
}

migrate().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
