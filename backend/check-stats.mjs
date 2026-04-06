/**
 * Diagnostic script: check words_read and read_times tracking
 * Run from: backend/
 *   node check-stats.mjs
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'sqlite.db'), { readonly: true });

console.log('\n==============  LESSONS (read_times + listen_time)  ==============');
const lessons = db.prepare(`
  SELECT id, title, read_times, listen_time, duration
  FROM lessons
  WHERE lessons.read_times > 0
  ORDER BY last_update_date DESC
  LIMIT 10
`).all();
if (lessons) {
  console.table(lessons.map(l => ({
    title: l.title.slice(0, 30),
    read_times: l.read_times,
    listen_time: Number(l.listen_time ?? 0).toFixed(3),
    duration_sec: l.duration
  })));
} else {
  console.table([{
    title: "There is no lessons that has been read so far!"
  }]);
}

console.log('\n==============  USER LESSON PROGRESS (frontier + listen)  ==============');
const progress = db.prepare(`
  SELECT ulp.lesson_id, l.title, ulp.highest_page_read, ulp.total_listened_sec, ulp.is_completed
  FROM user_lesson_progress ulp
  JOIN lessons l ON ulp.lesson_id = l.id
  ORDER BY ulp.id DESC
  LIMIT 10
`).all();
console.table(progress.map(p => ({
  title: p.title.slice(0, 30),
  highest_page: p.highest_page_read,
  listened_sec: p.total_listened_sec,
  completed: !!p.is_completed
})));

console.log('\n==============  USER DAILY STATS (words_read + listening_sec)  ==============');
const daily = db.prepare(`
  SELECT log_date, language_code, words_read, listening_sec
  FROM user_daily_stats
  ORDER BY log_date DESC
  LIMIT 10
`).all();
console.table(daily.map(d => ({
  date: new Date(d.log_date * 1000).toLocaleDateString(),
  lang: d.language_code,
  words_read: d.words_read,
  listening_sec: d.listening_sec
})));

db.close();
