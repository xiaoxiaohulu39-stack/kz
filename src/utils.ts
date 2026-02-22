import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GRID_COLS = 6;
export const GRID_ROWS = 10;
export const INITIAL_ROWS = 4;

export type GameMode = 'classic' | 'time';
export type GameStatus = 'idle' | 'playing' | 'gameover';

export interface Block {
  id: string;
  value: number;
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function getRandomValue() {
  // Values between 1 and 9
  return Math.floor(Math.random() * 9) + 1;
}

export function generateRow(): (Block | null)[] {
  return Array.from({ length: GRID_COLS }, () => ({
    id: generateId(),
    value: getRandomValue(),
  }));
}
