import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate time allowed for a question based on total text length.
 * Base: 20s. +1s per 40 chars over 100. Min 20s, Max 45s.
 */
export function calculateQuestionTime(question: string, answers: string[]): number {
  const totalLength = question.length + answers.reduce((sum, a) => sum + a.length, 0);
  const extra = Math.max(0, totalLength - 100);
  const bonus = Math.floor(extra / 40);
  return Math.min(45, 20 + bonus);
}
