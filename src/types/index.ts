export const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AED'] as const;
export type Currency = (typeof currencies)[number];
export const categories = [
  'Food & Drinks',
  'Travel',
  'Shopping',
  'Accommodation',
  'Entertainment',
  'Utilities',
  'Other',
] as const;
export type Category = (typeof categories)[number];
export type SplitMethod = 'equal' | 'exact' | 'percentage';
export interface Group {
  currencyLocked?: boolean;
  id: string;
  name: string;
  currency: Currency;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}
export interface Member {
  id: string;
  groupId: string;
  name: string;
  avatarColor: string;
  createdAt: string;
}
export interface Share {
  memberId: string;
  amountMinor: number;
  basisPoints?: number;
}
export interface Expense {
  id: string;
  groupId: string;
  description: string;
  category: Category;
  amountMinor: number;
  payerId: string;
  participants: Share[];
  splitMethod: SplitMethod;
  date: string;
  createdAt: string;
  updatedAt: string;
}
export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
export interface AppData {
  version: 1;
  defaultCurrency: Currency;
  groups: Group[];
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
}
export interface Transfer {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
}
