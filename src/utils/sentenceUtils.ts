export function extractSentencesFromText(text: string): string[] {
  if (!text || !text.trim()) return [];
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  const result: string[] = [];

  for (const line of lines) {
    const sentenceRegex = /[^.!?。！？؟؛]+[.!?。！？؟؛]+/g;
    const matches = line.match(sentenceRegex);

    if (matches && matches.length > 0) {
      let reconstructedLength = 0;
      for (const match of matches) {
        result.push(match.trim());
        reconstructedLength += match.length;
      }
      if (reconstructedLength < line.length) {
        const remainder = line.slice(reconstructedLength).trim();
        if (remainder) result.push(remainder);
      }
    } else {
      result.push(line.trim());
    }
  }
  return result;
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
