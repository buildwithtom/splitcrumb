import type { Currency } from '../types';
export function parseMoney(value: string, allowZero = false): number {
  const s = value.trim();
  if (s.length > 30) throw new Error('This amount is too large. Please enter a smaller amount.');
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw new Error(
      'Enter an amount with up to 2 decimal places, without commas or currency symbols.',
    );
  const [whole, fraction = ''] = s.split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (minor > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('This amount is too large. Please enter a smaller amount.');
  if (minor === 0n && !allowZero) throw new Error('Enter an amount greater than zero.');
  return Number(minor);
}
export function formatMoney(minor: number, currency: Currency): string {
  const fraction = Math.abs(minor % 100);
  const whole = BigInt(minor) / 100n;
  const parts = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: fraction === 0 ? 0 : 2,
  }).formatToParts(minor < 0 && whole === 0n ? -0 : whole);
  return parts
    .map((p) => (p.type === 'fraction' ? String(fraction).padStart(2, '0') : p.value))
    .join('');
}
export function moneyInput(minor: number): string {
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
}
export function sumMoney(values: number[]): number {
  const n = values.reduce((total, v) => total + BigInt(v), 0n);
  if (n > BigInt(Number.MAX_SAFE_INTEGER) || n < -BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('The combined total is too large to store safely.');
  return Number(n);
}
