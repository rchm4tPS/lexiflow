import type { Token, Phrase, DbPhrase } from '../types/reader';

interface PhraseInstance extends Phrase {
  startIndex?: number;
}

export const buildPhraseInstances = (
  tokens: Token[], 
  dbPhrases: DbPhrase[]
): Phrase[] => {
  const instances: PhraseInstance[] = [];
  
  const wordTokens = tokens.filter(t => !t.isNewline && t.text.match(/\p{L}/u));

  dbPhrases.forEach(dbP => {
    const targetWords = dbP.phrase_text.toLowerCase().split(' ').filter(Boolean);
    const len = targetWords.length;

    for (let i = 0; i <= wordTokens.length - len; i++) {
      let match = true;
      const range: string[] = [];
      
      for (let j = 0; j < len; j++) {
        if (wordTokens[i + j].text.toLowerCase() !== targetWords[j]) {
          match = false; 
          break;
        }
        range.push(wordTokens[i + j].id);
      }
      
      if (match) {
        instances.push({
          id: `${dbP.id}_${i}`,
          dbId: dbP.id,
          text: dbP.phrase_text,
          meaning: dbP.user_meaning || dbP.meaning,
          stage: dbP.stage,
          notes: dbP.notes,
          word_tags: dbP.phrase_tags ? dbP.phrase_tags.split(',') : [],
          range: range,
          isPhrase: true,
          startIndex: i
        });
      }
    }
  });

  instances.sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));

  return instances;
};