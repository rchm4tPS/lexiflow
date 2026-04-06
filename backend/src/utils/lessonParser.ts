import { db } from '../db/index.js';
import { 
    lessons, 
    lessonContent, 
    masterVocab, 
    userVocabRelation, 
    userLessonProgress
} from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Tokenizes raw text and updates lesson content and word counts.
 * Optionally initializes or updates user progress for a specific user.
 */
export async function parseAndSaveLessonContent(
    lessonId: string, 
    rawText: string, 
    languageCode: string, 
    userIdForProgress?: string
) {
    // 1. Unicode-aware Tokenization
    // \p{L} matches any letter in any language. \p{M} matches marks (diacritics).
    const rawTokens = rawText.match(/\n|(\p{L}+\p{M}*\s?-\s?\p{L}+\p{M}*)|[\p{L}\p{M}-]+|[^\p{L}\p{M}\s]/gu) || [];

    const processedTokens = [];
    let currentPageIndex = 0;
    let wordCountOnPage = 0;
    
    // CONFIG: soft target for word count, hard limit to force breaks on sentences
    const SOFT_TARGET = 40;
    const HARD_LIMIT = 50;

    let totalOriginalWordInLesson = 0;
    
    for (const [index, text] of rawTokens.entries()) {
        const isNewline = text === '\n';
        const isLearnable = !isNewline && /^[\p{L}\p{M}-]+$/u.test(text);

        const isSentenceEnd = /[.!?]/.test(text);

        if (isLearnable) {
            totalOriginalWordInLesson++;
            let [masterWord] = await db.select().from(masterVocab)
                .where(and(eq(masterVocab.original_word, text.toLowerCase()), eq(masterVocab.language_code, languageCode)));

            if (!masterWord) {
                [masterWord] = await db.insert(masterVocab).values({
                    original_word: text.toLowerCase(),
                    language_code: languageCode,
                }).returning();
            }
        }

        processedTokens.push({
            id: `t${lessonId}-${index}`,
            text: isNewline ? '\n\n' : text,
            isNewline,
            isLearnable,
            pageIndex: currentPageIndex
        });

        if (isLearnable) {
            wordCountOnPage++;
        }

        // --- SMART PAGINATION LOGIC ---
        // 1. Break on Paragraph (newline) if SOFT_TARGET reached
        if (isNewline && wordCountOnPage >= SOFT_TARGET) {
            currentPageIndex++;
            wordCountOnPage = 0;
        } 
        // 2. OR Break on Sentence if HARD_LIMIT reached (fallback for long paragraphs)
        else if (isSentenceEnd && wordCountOnPage >= HARD_LIMIT) {
            currentPageIndex++;
            wordCountOnPage = 0;
        }
    }

    const setOfUniqueWordInLesson = new Set(
        processedTokens
          .filter((w) => w.isLearnable === true)
          .map((w) => w.text.toLowerCase())
    );
    const totalOfUniqueWordInLesson = setOfUniqueWordInLesson.size;

    // 2. Update Lesson stats
    await db.update(lessons).set({
        total_words: totalOriginalWordInLesson,
        unique_words: totalOfUniqueWordInLesson,
        original_text: rawText
    }).where(eq(lessons.id, lessonId));

    // 3. Update lesson_content
    await db.insert(lessonContent).values({
        lesson_id: lessonId,
        raw_text: JSON.stringify(processedTokens),
    }).onConflictDoUpdate({
        target: lessonContent.lesson_id,
        set: { raw_text: JSON.stringify(processedTokens) }
    });

    // 4. (Optional) Initialize/Update user progress
    if (userIdForProgress) {
        const uniqueArray = Array.from(setOfUniqueWordInLesson);
        let initialNewWords = uniqueArray.length;
        let initialLingqs = 0;
        let initialKnown = 0;

        if (uniqueArray.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < uniqueArray.length; i += chunkSize) {
                const chunk = uniqueArray.slice(i, i + chunkSize);
                const existingVocab = await db.select({ stage: userVocabRelation.stage })
                    .from(userVocabRelation)
                    .innerJoin(masterVocab, eq(userVocabRelation.master_word_id, masterVocab.id))
                    .where(and(eq(userVocabRelation.user_id, userIdForProgress), inArray(masterVocab.original_word, chunk)));

                for (const vocab of existingVocab) {
                    const stage = vocab?.stage ?? 0;
                    if (stage >= 1 && stage <= 4) { initialLingqs++; initialNewWords--; }
                    else if (stage === 5 || stage === 6) { initialKnown++; initialNewWords--; }
                }
            }
        }

        await db.insert(userLessonProgress).values({
            user_id: userIdForProgress,
            lesson_id: lessonId,
            new_words_count: initialNewWords,
            lingqs_count: initialLingqs,
            known_words_count: initialKnown,
            is_completed: initialNewWords === 0,
        }).onConflictDoUpdate({
            target: [userLessonProgress.user_id, userLessonProgress.lesson_id],
            set: {
                new_words_count: initialNewWords,
                lingqs_count: initialLingqs,
                known_words_count: initialKnown,
                is_completed: initialNewWords === 0
            }
        });
    }

    return processedTokens;
}
