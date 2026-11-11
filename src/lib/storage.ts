import type { AppData } from '../types';
import { validateData } from './validation';
export const STORAGE_KEY = 'splitcrumb:data';
export const emptyData = (): AppData => ({
  version: 1,
  defaultCurrency: 'INR',
  groups: [],
  members: [],
  expenses: [],
  settlements: [],
});
// Add explicit version migrations here. Unknown versions are preserved, never overwritten.
export function migrate(value: unknown): AppData {
  return validateData(value);
}
export function importData(raw: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('This file is not valid JSON. Choose a Splitcrumb export.');
  }
  return migrate(parsed);
}
export function loadData(storage: Pick<Storage, 'getItem'> = localStorage): {
  data: AppData;
  raw?: string;
  error?: string;
} {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    return { data: raw !== null ? importData(raw) : emptyData(), raw: raw ?? undefined };
  } catch (error) {
    return {
      data: emptyData(),
      raw: raw ?? undefined,
      error: error instanceof Error ? error.message : 'Browser storage is unavailable.',
    };
  }
}
export function saveData(data: AppData, storage: Pick<Storage, 'setItem'> = localStorage) {
  validateData(data);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    throw new Error(
      'Could not save to this browser. Storage may be full or blocked. Your change has not been applied. Export a backup before continuing.',
    );
  }
}
export function downloadFile(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
