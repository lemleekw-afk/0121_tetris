
export interface GameObject {
  id: string;
  word: string;
  col: number;
  row: number;
  status: 'moving' | 'fixed' | 'exploding';
  color: string;
}

export interface Ranking {
  name: string;
  score: number;
  theme?: string;
}

export const COLUMNS = 6;
export const ROWS = 10;
export const FALL_DURATION = 1000;
export const SPAWN_DELAY = 1000;

export const COLOR_PALETTE = [
  'bg-red-600', 'bg-blue-600', 'bg-yellow-500', 'bg-green-600',
  'bg-purple-600', 'bg-orange-500', 'bg-cyan-500', 'bg-pink-500',
  'bg-lime-500', 'bg-teal-600'
];
