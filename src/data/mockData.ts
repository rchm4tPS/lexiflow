export type Token = {
  id: string; // e.g., "t1"
  text: string;
  status: 'new' | 'learning' | 'known' | 'ignored';
  stage: number;
  pageIndex: number;
  phrase_id?: string; // Links to a Phrase
  meaning?: string;
  isNewline?: boolean;
};

export type Phrase = {
  id: string; // e.g., "p1"
  range: string[]; // Array of Token IDs, e.g., ["t2", "t3"]
  stage: number;
  meaning?: string;
};

// Refactored 3-Page Lesson
export const threePageTokens: Token[] =[
  { id: "t1", text: "چقدر", status: 'known', stage: 5, pageIndex: 0 },
  { id: "t2", text: "پول", status: 'new', stage: 0, pageIndex: 0 },
  { id: "t3", text: "می", status: 'learning', stage: 1, pageIndex: 0, phrase_id: "p1" },
  { id: "t4", text: "خواهی", status: 'learning', stage: 1, pageIndex: 0, phrase_id: "p1" },
  { id: "t5", text: "حالا", status: 'learning', stage: 1, pageIndex: 0, phrase_id: "p1" },
  { id: "t6", text: "دیگه", status: 'learning', stage: 1, pageIndex: 0, phrase_id: "p1" },
  { id: "t7", text: "\n\n", isNewline: true, status: 'known', stage: 5, pageIndex: 0 },
  
  { id: "t8", text: "Das", status: 'known', stage: 5, pageIndex: 1 },
  { id: "t9", text: "war", status: 'new', stage: 0, pageIndex: 1 },
  
  { id: "t10", text: "Ende", status: 'new', stage: 0, pageIndex: 2 },
];

export const threePagePhrases: Phrase[] = [
  { id: "p1", range:["t3", "t4"], stage: 1, meaning: "decided this" }
];