import type { AppData, Expense, Settlement } from '../types';
import { emptyData } from './storage';
import { equalSplit } from './splits';
const now = '2026-11-10T00:00:00.000Z';
export function fixture(): AppData {
  return {
    ...emptyData(),
    groups: [
      {
        id: 'g',
        name: 'Friends',
        currency: 'INR',
        memberIds: ['a', 'b', 'c'],
        createdAt: now,
        updatedAt: now,
      },
    ],
    members: ['a', 'b', 'c'].map((id, i) => ({
      id,
      name: ['Alex', 'Sam', 'Tom'][i],
      groupId: 'g',
      avatarColor: '#BEF264',
      createdAt: now,
    })),
    expenses: [expense()],
  };
}
export function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e',
    groupId: 'g',
    description: 'Dinner',
    category: 'Food & Drinks',
    amountMinor: 90000,
    payerId: 'a',
    participants: equalSplit(90000, ['a', 'b', 'c']),
    splitMethod: 'equal',
    date: '2026-11-10',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
export function settlement(amountMinor: number): Settlement {
  return {
    id: 's',
    groupId: 'g',
    fromMemberId: 'b',
    toMemberId: 'a',
    amountMinor,
    date: '2026-11-10',
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}
