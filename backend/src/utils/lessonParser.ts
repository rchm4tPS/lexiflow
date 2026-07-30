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
    userIdForProgress?: string,
    isPreSegmented: boolean = false,
    audioTimestamps?: { start: number; end: number }[]
) {
    let segments: { segment: string; isWordLike: boolean }[] = [];

    if (isPreSegmented) {
        // LingQ provides pre-segmented text where words are separated by spaces.
        // We extract non-whitespace chunks and individual spaces/newlines.
        const tokens = rawText.match(/\S+|\n|\s/g) || [];
        
        for (const token of tokens) {
            // Is it a pure whitespace/newline token?
            if (/^\s+$/.test(token)) {
                segments.push({ segment: token, isWordLike: false });
                continue;
            }
            
            // Separate leading/trailing punctuation from the actual word (e.g. ":迈克" -> ":" and "迈克")
            const match = token.match(/^([\p{P}\p{S}]*)(.*?)([\p{P}\p{S}]*)$/u);
            if (match) {
                const [, leading, word, trailing] = match;
                
                if (leading) {
                    segments.push({ segment: leading, isWordLike: false });
                }
                
                if (word) {
                    // Check if it's learnable (contains at least one letter/number/ideograph)
                    const isLearnable = /[\p{L}\p{N}]/u.test(word);
                    segments.push({ segment: word, isWordLike: isLearnable });
                }
                
                if (trailing) {
                    segments.push({ segment: trailing, isWordLike: false });
                }
            } else {
                const isLearnable = /[\p{L}\p{N}]/u.test(token);
                segments.push({ segment: token, isWordLike: isLearnable });
            }
        }
    } else {
        // Fallback to Intl.Segmenter for generic raw text
        const segmenter = new Intl.Segmenter(languageCode, { granularity: 'word' });
        segments = Array.from(segmenter.segment(rawText)).map(s => ({
            segment: s.segment,
            isWordLike: s.isWordLike === true
        }));
    }

    // --- BULK MASTER VOCAB OPTIMIZATION (Eliminates N+1 Queries) ---
    const learnableTerms = segments
        .filter(s => s.isWordLike)
        .map(s => s.segment.toLowerCase());

    const uniqueTermsSet = new Set(learnableTerms);
    const uniqueTermsArray = Array.from(uniqueTermsSet);

    if (uniqueTermsArray.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < uniqueTermsArray.length; i += chunkSize) {
            const chunk = uniqueTermsArray.slice(i, i + chunkSize);
            const existingMaster = await db.select({ word: masterVocab.original_word })
                .from(masterVocab)
                .where(and(eq(masterVocab.language_code, languageCode), inArray(masterVocab.original_word, chunk)));
            
            const existingWordsSet = new Set(existingMaster.map(m => m.word));
            const missingWords = chunk.filter(w => !existingWordsSet.has(w));
            
            if (missingWords.length > 0) {
                await db.insert(masterVocab).values(
                    missingWords.map(w => ({
                        original_word: w,
                        language_code: languageCode
                    }))
                ).onConflictDoNothing();
            }
        }
    }

    const processedTokens = [];
    let currentPageIndex = 0;
    let wordCountOnPage = 0;
    
    // CONFIG: soft target for word count, hard limit to force breaks on sentences
    const SOFT_TARGET = 40;
    const HARD_LIMIT = 50;

    let totalOriginalWordInLesson = 0;
    
    for (const [index, segmentData] of segments.entries()) {
        const text = segmentData.segment;
        const isNewline = text === '\n' || text === '\r\n';
        const isLearnable = segmentData.isWordLike;

        const isSentenceEnd = /[.!?。！？؟؛]/.test(text);

        if (isLearnable) {
            totalOriginalWordInLesson++;
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
    const contentPayload: {
        lesson_id: string;
        raw_text: string;
        audio_timestamps?: { start: number; end: number }[] | null;
    } = {
        lesson_id: lessonId,
        raw_text: JSON.stringify(processedTokens),
    };

    if (audioTimestamps !== undefined) {
        contentPayload.audio_timestamps = audioTimestamps;
    }

    await db.insert(lessonContent).values(contentPayload).onConflictDoUpdate({
        target: lessonContent.lesson_id,
        set: {
            raw_text: JSON.stringify(processedTokens),
            ...(audioTimestamps !== undefined ? { audio_timestamps: audioTimestamps } : {})
        }
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
