export function extractSentencesFromText(text: string): string[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export function assignSentencePageIndexToTokens<T extends { text: string; isNewline?: boolean; sentencePageIndex?: number }>(
  tokens: T[],
  rawText: string
): T[] {
  if (!tokens || tokens.length === 0) return tokens;

  const sentences = extractSentencesFromText(rawText);
  if (sentences.length === 0) {
    return tokens.map(t => ({ ...t, sentencePageIndex: 0 }));
  }

  const cleanSentences = sentences.map(s => s.replace(/\s+/g, ''));
  
  let currentSentenceIdx = 0;
  let accumulatedTokenText = '';

  return tokens.map(t => {
    const updated = { ...t, sentencePageIndex: currentSentenceIdx };

    if (!t.isNewline && t.text) {
      accumulatedTokenText += t.text.replace(/\s+/g, '');
    }

    const targetSentence = cleanSentences[currentSentenceIdx] || '';

    if (
      targetSentence &&
      accumulatedTokenText.length >= targetSentence.length &&
      currentSentenceIdx < sentences.length - 1
    ) {
      currentSentenceIdx++;
      accumulatedTokenText = '';
    } else if (t.isNewline && accumulatedTokenText.length > 0 && currentSentenceIdx < sentences.length - 1) {
      currentSentenceIdx++;
      accumulatedTokenText = '';
    }

    return updated;
  });
}
