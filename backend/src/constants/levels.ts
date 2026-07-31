export const LEVELS = ['Beginner 1', 'Beginner 2', 'Intermediate 1', 'Intermediate 2', 'Advanced 1', 'Advanced 2'] as const;
export type Level = typeof LEVELS[number];
