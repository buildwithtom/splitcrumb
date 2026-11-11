import { createContext, useContext } from 'react';
import type { AppData, Expense, Group, Settlement, Transfer } from '../types';
export type ModalState =
  | { kind: 'group'; group?: Group }
  | { kind: 'members'; group: Group }
  | { kind: 'expense'; group: Group; expense?: Expense }
  | { kind: 'settlement'; group: Group; settlement?: Settlement; transfer?: Transfer }
  | { kind: 'confirm'; title: string; description: string; action: () => void; danger?: boolean }
  | { kind: 'summary'; text: string }
  | null;
interface State {
  data: AppData;
  commit: (next: AppData, message?: string) => boolean;
  open: (modal: ModalState) => void;
  notify: (message: string, error?: boolean) => void;
  recovery?: string;
  storageError?: string;
  replaceData: (next: AppData) => boolean;
}
export const AppContext = createContext<State | null>(null);
export function useApp() {
  const state = useContext(AppContext);
  if (!state) throw new Error('Splitcrumb provider missing.');
  return state;
}
export const uid = () => crypto.randomUUID();
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const avatarColors = ['#C0D98F', '#D3B5E5', '#E5B596', '#91C7D2', '#E2CF8B', '#A3B9E4'];
