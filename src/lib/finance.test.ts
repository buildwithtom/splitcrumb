import { describe, it, expect } from 'vitest';
import { equalSplit, exactSplit, percentageSplit } from './splits';
import { parseMoney, sumMoney, moneyInput } from './money';
import { balances, suggestSettlements, currencyTotals } from './balances';
import { validateData } from './validation';
import { fixture, expense, settlement } from './fixtures';
describe('monetary input', () => {
  it('parses decimal strings directly to integer cents', () => {
    expect(parseMoney('123.45')).toBe(12345);
    expect(parseMoney(' 001.2 ')).toBe(120);
    expect(parseMoney('0.01')).toBe(1);
  });
  it.each([
    '-1',
    '0',
    '0.00',
    'NaN',
    'Infinity',
    '1e3',
    '1,000',
    '₹100',
    '1.234',
    '.5',
    '2.',
    '',
    '12 3',
    '90071992547409.92',
  ])('rejects malformed, negative, zero, or unsafe input: %s', (value) =>
    expect(() => parseMoney(value)).toThrow(),
  );
  it('accepts exact largest safe integer and roundtrips it', () => {
    expect(parseMoney('90071992547409.91')).toBe(Number.MAX_SAFE_INTEGER);
    expect(parseMoney(moneyInput(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('rejects unsafe aggregate totals', () =>
    expect(() => sumMoney([Number.MAX_SAFE_INTEGER, 1])).toThrow());
});
describe('allocations', () => {
  it('splits equally with exact division', () =>
    expect(equalSplit(90000, ['a', 'b', 'c']).map((s) => s.amountMinor)).toEqual([
      30000, 30000, 30000,
    ]));
  it('distributes the smallest units using stable IDs, independent of selection order', () => {
    const expected = [
      { memberId: 'a', amountMinor: 3334 },
      { memberId: 'b', amountMinor: 3333 },
      { memberId: 'c', amountMinor: 3333 },
    ];
    expect(equalSplit(10000, ['c', 'a', 'b'])).toEqual(expected);
    expect(sumMoney(expected.map((s) => s.amountMinor))).toBe(10000);
  });
  it('handles amounts smaller than participant count', () =>
    expect(equalSplit(1, ['b', 'a', 'c']).map((s) => s.amountMinor)).toEqual([1, 0, 0]));
  it('validates exact sums in minor units', () => {
    expect(exactSplit(100, ['a', 'b'], { a: '0.60', b: '0.40' }).map((s) => s.amountMinor)).toEqual(
      [60, 40],
    );
    expect(() => exactSplit(100, ['a', 'b'], { a: '0.60', b: '0.41' })).toThrow('add up');
  });
  it('uses largest remainders with percentage precision of two decimals', () =>
    expect(
      percentageSplit(10000, ['a', 'b', 'c'], { a: '33.33', b: '33.33', c: '33.34' }).map(
        (s) => s.amountMinor,
      ),
    ).toEqual([3333, 3333, 3334]));
  it('breaks percentage rounding ties by stable ID', () =>
    expect(percentageSplit(1, ['b', 'a'], { a: '50', b: '50' }).map((s) => s.amountMinor)).toEqual([
      1, 0,
    ]));
  it('uses integer products for very large percentage amounts', () => {
    const result = percentageSplit(Number.MAX_SAFE_INTEGER, ['a', 'b'], { a: '50', b: '50' });
    expect(result.map((s) => s.amountMinor)).toEqual([4503599627370496, 4503599627370495]);
  });
  it('rejects invalid percentages, totals and participant IDs', () => {
    expect(() => percentageSplit(100, ['a', 'b'], { a: '50', b: '49.99' })).toThrow();
    expect(() => percentageSplit(100, ['a'], { a: '100.001' })).toThrow();
    expect(() => percentageSplit(100, ['a', 'b'], { a: '101', b: '0' })).toThrow();
    expect(() => equalSplit(100, [])).toThrow();
    expect(() => equalSplit(100, ['a', 'a'])).toThrow();
    expect(() => equalSplit(0, ['a'])).toThrow();
  });
  it('reconciles equal and percentage splits across many totals', () => {
    for (let total = 1; total < 10000; total += 31) {
      expect(sumMoney(equalSplit(total, ['a', 'b', 'c']).map((s) => s.amountMinor))).toBe(total);
      expect(
        sumMoney(
          percentageSplit(total, ['c', 'b', 'a'], { a: '14.29', b: '28.57', c: '57.14' }).map(
            (s) => s.amountMinor,
          ),
        ),
      ).toBe(total);
    }
  });
});
describe('balances and settlements', () => {
  it('includes the payer’s own share: Alex pays ₹900', () =>
    expect(balances(fixture(), 'g')).toEqual({ a: 60000, b: -30000, c: -30000 }));
  it('allows payer excluded from participants', () => {
    const data = fixture();
    data.expenses[0] = expense({ participants: equalSplit(90000, ['b', 'c']) });
    expect(balances(data, 'g')).toEqual({ a: 90000, b: -45000, c: -45000 });
  });
  it('handles a two-person expense', () => {
    const data = fixture();
    data.expenses[0] = expense({ amountMinor: 10001, participants: equalSplit(10001, ['a', 'b']) });
    expect(balances(data, 'g')).toEqual({ a: 5000, b: -5000, c: 0 });
  });
  it('matches multiple creditors and debtors deterministically without mutating inputs', () => {
    const net = { a: 600, b: 200, c: -500, d: -300 };
    const original = { ...net };
    expect(suggestSettlements(net)).toEqual([
      { fromMemberId: 'c', toMemberId: 'a', amountMinor: 500 },
      { fromMemberId: 'd', toMemberId: 'a', amountMinor: 100 },
      { fromMemberId: 'd', toMemberId: 'b', amountMinor: 200 },
    ]);
    expect(net).toEqual(original);
  });
  it('applies partial settlement without counting it as an expense', () => {
    const data = fixture();
    data.settlements = [settlement(20000)];
    expect(balances(data, 'g')).toEqual({ a: 40000, b: -10000, c: -30000 });
    expect(currencyTotals(data)).toEqual({ INR: 90000 });
  });
  it('settles all balances fully', () => {
    const data = fixture();
    data.settlements = [settlement(30000), { ...settlement(30000), id: 's2', fromMemberId: 'c' }];
    expect(balances(data, 'g')).toEqual({ a: 0, b: 0, c: 0 });
    expect(suggestSettlements(balances(data, 'g'))).toEqual([]);
  });
  it('recalculates immediately when an expense is edited', () => {
    const data = fixture();
    expect(balances(data, 'g').a).toBe(60000);
    data.expenses[0] = expense({
      amountMinor: 120000,
      participants: equalSplit(120000, ['a', 'b', 'c']),
    });
    expect(balances(data, 'g')).toEqual({ a: 80000, b: -40000, c: -40000 });
  });
  it('recalculates after deleting expenses', () => {
    const data = fixture();
    data.expenses = [];
    expect(balances(data, 'g')).toEqual({ a: 0, b: 0, c: 0 });
  });
  it('recalculates after editing and deleting settlements', () => {
    const data = fixture();
    data.settlements = [settlement(10000)];
    expect(balances(data, 'g').b).toBe(-20000);
    data.settlements[0].amountMinor = 20000;
    expect(balances(data, 'g').b).toBe(-10000);
    data.settlements = [];
    expect(balances(data, 'g').b).toBe(-30000);
  });
  it('keeps duplicate member names distinct by ID', () => {
    const data = fixture();
    data.members.forEach((m) => (m.name = 'Alex'));
    expect(validateData(data).members).toHaveLength(3);
    expect(balances(data, 'g')).toEqual({ a: 60000, b: -30000, c: -30000 });
  });
  it('separates currency totals', () => {
    const data = fixture();
    data.groups.push({ ...data.groups[0], id: 'g2', currency: 'USD', memberIds: ['d', 'f'] });
    data.members.push(...['d', 'f'].map((id) => ({ ...data.members[0], id, groupId: 'g2' })));
    data.expenses.push(
      expense({
        id: 'e2',
        groupId: 'g2',
        payerId: 'd',
        amountMinor: 1500,
        participants: equalSplit(1500, ['d', 'f']),
      }),
    );
    expect(currencyTotals(validateData(data))).toEqual({ INR: 90000, USD: 1500 });
    expect(balances(data, 'g2')).toEqual({ d: 750, f: -750 });
  });
  it('balances sum to zero through edits and suggested payments', () => {
    const data = fixture();
    data.expenses.push(
      expense({
        id: 'e2',
        payerId: 'b',
        amountMinor: 10001,
        participants: equalSplit(10001, ['b', 'c']),
      }),
    );
    const net = balances(data, 'g');
    expect(sumMoney(Object.values(net))).toBe(0);
    data.settlements = suggestSettlements(net).map((s, i) => ({
      ...settlement(1),
      ...s,
      id: `s${i}`,
    }));
    expect(Object.values(balances(data, 'g')).every((n) => n === 0)).toBe(true);
  });
});
