import type { Share } from '../types';
import { parseMoney, sumMoney } from './money';
function validate(total: number, ids: string[]) {
  if (!Number.isSafeInteger(total) || total <= 0) throw new Error('Enter a valid positive amount.');
  if (!ids.length) throw new Error('Select at least one participant.');
  if (new Set(ids).size !== ids.length) throw new Error('Each participant can appear only once.');
}
export function equalSplit(total: number, ids: string[]): Share[] {
  validate(total, ids);
  const sorted = [...ids].sort();
  const base = Math.floor(total / sorted.length),
    remainder = total % sorted.length;
  return sorted.map((memberId, i) => ({ memberId, amountMinor: base + (i < remainder ? 1 : 0) }));
}
export function exactSplit(total: number, ids: string[], values: Record<string, string>): Share[] {
  validate(total, ids);
  const shares = [...ids]
    .sort()
    .map((memberId) => ({ memberId, amountMinor: parseMoney(values[memberId] || '0', true) }));
  if (sumMoney(shares.map((s) => s.amountMinor)) !== total)
    throw new Error('The exact amounts must add up to the expense total.');
  return shares;
}
export function percentageSplit(
  total: number,
  ids: string[],
  values: Record<string, string>,
): Share[] {
  validate(total, ids);
  const parts = [...ids].sort().map((memberId) => {
    const basisPoints = parseMoney(values[memberId] || '0', true);
    if (basisPoints > 10000) throw new Error('Each percentage must be between 0 and 100.');
    const product = BigInt(total) * BigInt(basisPoints);
    return {
      memberId,
      basisPoints,
      amountMinor: Number(product / 10000n),
      remainder: Number(product % 10000n),
    };
  });
  if (sumMoney(parts.map((p) => p.basisPoints)) !== 10000)
    throw new Error('Percentages must add up to exactly 100.00%.');
  const remaining = total - sumMoney(parts.map((p) => p.amountMinor));
  const ranked = [...parts].sort(
    (a, b) => b.remainder - a.remainder || (a.memberId < b.memberId ? -1 : 1),
  );
  ranked.slice(0, remaining).forEach((p) => p.amountMinor++);
  return parts.map(({ memberId, amountMinor, basisPoints }) => ({
    memberId,
    amountMinor,
    basisPoints,
  }));
}
