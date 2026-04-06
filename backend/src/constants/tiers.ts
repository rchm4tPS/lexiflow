export interface Tier {
  id: string;
  lingqGoal: number;
  listenMinGoal: number;
}

export const TIERS: Tier[] = [
  {
    id: 'calm',
    lingqGoal: 13,
    listenMinGoal: 10,
  },
  {
    id: 'steady',
    lingqGoal: 25,
    listenMinGoal: 30,
  },
  {
    id: 'dedicated',
    lingqGoal: 50,
    listenMinGoal: 45,
  },
  {
    id: 'pro',
    lingqGoal: 100,
    listenMinGoal: 60,
  },
];

export function getTier(id: string | null | undefined): Tier {
  return TIERS.find(t => t.id === id) ?? TIERS[0]!;
}
