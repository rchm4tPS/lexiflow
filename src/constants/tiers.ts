// ─── Shared Daily Goal Tier Config ──────────────────────────────────────────
// This is the canonical definition used by SignUpView, LibraryView, and
// any other place that needs to know about tier names, goals, or colors.

export interface Tier {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  // Numeric goals for progress tracking
  lingqGoal: number;       // LingQs to create per day
  learnedGoal: number;     // LingQs to learn per day
  listenMinGoal: number;   // Minutes of listening per day
  readGoal: number;        // Words read per day
  // Tailwind class tokens (used for dynamic className building)
  color: string;           // gradient classes (for decorative use)
  border: string;
  bg: string;
  text: string;
  ring: string;            // ring color for focus / active states
  // Raw hex for canvas/SVG progress rings where Tailwind can't be used
  hex: string;
}

export const TIERS: Tier[] = [
  {
    id: 'calm',
    label: 'Calm',
    emoji: '🌿',
    desc: '10 min listening · 13 LingQs/day',
    lingqGoal: 13,
    learnedGoal: 5,
    listenMinGoal: 10,
    readGoal: 200,
    color: 'from-emerald-400 to-teal-500',
    border: 'border-emerald-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-300',
    hex: '#34d399',
  },
  {
    id: 'steady',
    label: 'Steady',
    emoji: '📘',
    desc: '30 min listening · 25 LingQs/day',
    lingqGoal: 25,
    learnedGoal: 10,
    listenMinGoal: 30,
    readGoal: 500,
    color: 'from-blue-400 to-indigo-500',
    border: 'border-blue-400',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-300',
    hex: '#60a5fa',
  },
  {
    id: 'dedicated',
    label: 'Dedicated',
    emoji: '🔥',
    desc: '45 min listening · 50 LingQs/day',
    lingqGoal: 50,
    learnedGoal: 20,
    listenMinGoal: 45,
    readGoal: 1000,
    color: 'from-orange-400 to-amber-500',
    border: 'border-orange-400',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    ring: 'ring-orange-300',
    hex: '#fb923c',
  },
  {
    id: 'pro',
    label: 'Pro',
    emoji: '⚡',
    desc: '60 min listening · 100 LingQs/day',
    lingqGoal: 100,
    learnedGoal: 40,
    listenMinGoal: 60,
    readGoal: 2500,
    color: 'from-purple-500 to-pink-500',
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    ring: 'ring-purple-300',
    hex: '#a855f7',
  },
];

/** Quick lookup by tier id — returns 'calm' tier as fallback */
export function getTier(id: string | null | undefined): Tier {
  return TIERS.find(t => t.id === id) ?? TIERS[0];
}
