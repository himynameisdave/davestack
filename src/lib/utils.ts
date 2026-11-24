import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- clsx accepts a recursive, mutable ClassValue type
export function cn(...inputs: readonly ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
