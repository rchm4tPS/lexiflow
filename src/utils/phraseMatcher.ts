/* eslint-disable @typescript-eslint/no-explicit-any */
export const buildPhraseInstances = (tokens: any[], dbPhrases: any[]) => {
  const instances: any[] =[];
  
  // 1. Filter out punctuation and newlines to make text matching easier,
  // but keep a reference to the token's exact original ID.
  const wordTokens = tokens.filter(t => !t.isNewline && t.text.match(/\p{L}/u));

  dbPhrases.forEach(dbP => {
    // Standardize phrase text for comparison
    const targetWords = dbP.phrase_text.toLowerCase().split(' ').filter(Boolean);
    const len = targetWords.length;

    // Sliding window over the document
    for (let i = 0; i <= wordTokens.length - len; i++) {
      let match = true;
      const range =[];
      
      for (let j = 0; j < len; j++) {
        if (wordTokens[i + j].text.toLowerCase() !== targetWords[j]) {
          match = false; 
          break;
        }
        range.push(wordTokens[i + j].id);
      }
      
      if (match) {
        // Create an "Instance" of the phrase. 
        // We give it a composite ID so React can render multiples of the same phrase.
        instances.push({
          id: `${dbP.id}_${i}`, // Unique UI ID
          dbId: dbP.id,         // Real Backend ID
          text: dbP.phrase_text,
          meaning: dbP.user_meaning,
          stage: dbP.stage,
          notes: dbP.notes,
          word_tags: dbP.phrase_tags ? dbP.phrase_tags.split(',') : [],
          range: range,
          startIndex: i // NEW: Keep track of its exact position in the text
        });
      }
    }
  });

  // NEW: Sort instances so they flow chronologically in the document!
  instances.sort((a, b) => a.startIndex - b.startIndex);

  return instances;
};