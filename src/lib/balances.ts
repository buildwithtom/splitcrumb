import type { AppData, Currency, Transfer } from '../types';
import { sumMoney } from './money';
export function balances(data: AppData, groupId: string): Record<string, number> {
  const amounts = new Map(data.members.filter((m) => m.groupId === groupId).map((m) => [m.id, 0n]));
  const add = (id: string, n: bigint) => {
    if (!amounts.has(id)) throw new Error('A transaction refers to a missing member.');
    amounts.set(id, amounts.get(id)! + n);
  };
  for (const e of data.expenses.filter((e) => e.groupId === groupId)) {
    add(e.payerId, BigInt(e.amountMinor));
    e.participants.forEach((p) => add(p.memberId, -BigInt(p.amountMinor)));
  }
  for (const s of data.settlements.filter((s) => s.groupId === groupId)) {
    add(s.fromMemberId, BigInt(s.amountMinor));
    add(s.toMemberId, -BigInt(s.amountMinor));
  }
  return Object.fromEntries(
    [...amounts].map(([id, n]) => {
      if (n > BigInt(Number.MAX_SAFE_INTEGER) || n < -BigInt(Number.MAX_SAFE_INTEGER))
        throw new Error('A balance exceeds the safe numeric limit.');
      return [id, Number(n)];
    }),
  );
}
export function suggestSettlements(net: Record<string, number>): Transfer[] {
  if (sumMoney(Object.values(net)) !== 0) throw new Error('Balances do not reconcile.');
  const sort = (a: { id: string; amount: number }, b: { id: string; amount: number }) =>
    b.amount - a.amount || (a.id < b.id ? -1 : 1);
  const creditors = Object.entries(net)
    .filter(([, n]) => n > 0)
    .map(([id, amount]) => ({ id, amount }))
    .sort(sort);
  const debtors = Object.entries(net)
    .filter(([, n]) => n < 0)
    .map(([id, n]) => ({ id, amount: -n }))
    .sort(sort);
  const result: Transfer[] = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amountMinor = Math.min(debtors[i].amount, creditors[j].amount);
    result.push({ fromMemberId: debtors[i].id, toMemberId: creditors[j].id, amountMinor });
    debtors[i].amount -= amountMinor;
    creditors[j].amount -= amountMinor;
    if (!debtors[i].amount) i++;
    if (!creditors[j].amount) j++;
  }
  return result;
}
export function currencyTotals(data: AppData): Partial<Record<Currency, number>> {
  const result: Partial<Record<Currency, number>> = {};
  data.groups.forEach((g) => {
    result[g.currency] = sumMoney([
      result[g.currency] || 0,
      ...data.expenses.filter((e) => e.groupId === g.id).map((e) => e.amountMinor),
    ]);
  });
  return result;
}
