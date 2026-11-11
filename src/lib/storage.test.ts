import { beforeEach, describe, expect, it } from 'vitest';
import { emptyData, importData, loadData, saveData, STORAGE_KEY } from './storage';
import { fixture } from './fixtures';
import { validateData } from './validation';
beforeEach(() => localStorage.clear());
describe('validated persistence', () => {
  it('loads an empty browser safely', () => expect(loadData().data).toEqual(emptyData()));
  it('roundtrips valid data through storage and JSON import', () => {
    const data = fixture();
    saveData(data);
    expect(loadData().data).toEqual(data);
    expect(importData(JSON.stringify(data))).toEqual(data);
  });
  it('preserves corrupt localStorage for recovery', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    const result = loadData();
    expect(result.error).toContain('JSON');
    expect(result.raw).toBe('{broken');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken');
  });
  it('preserves unsupported future versions', () => {
    const raw = JSON.stringify({ ...emptyData(), version: 2 });
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadData().error).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  });
  it('reports blocked reads and failed writes', () => {
    expect(
      loadData({
        getItem: () => {
          throw new Error('Storage blocked');
        },
      }).error,
    ).toBe('Storage blocked');
    expect(() =>
      saveData(fixture(), {
        setItem: () => {
          throw new Error('Quota');
        },
      }),
    ).toThrow('not been applied');
  });
  it.each(['{}', 'null', '[]', 'not json', '{"version":1}'])(
    'rejects malformed imports: %s',
    (raw) => expect(() => importData(raw)).toThrow(),
  );
  it('rejects missing references and never persists invalid data', () => {
    const data = fixture();
    data.members.pop();
    expect(() => saveData(data)).toThrow('missing member');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('rejects mismatched group ownership', () => {
    const data = fixture();
    data.members[0].groupId = 'other';
    expect(() => validateData(data)).toThrow();
  });
  it('rejects duplicate record IDs and participants', () => {
    const data = fixture();
    data.expenses[0].id = 'a';
    expect(() => validateData(data)).toThrow('unique');
    const second = fixture();
    second.expenses[0].participants[1].memberId = 'a';
    expect(() => validateData(second)).toThrow('duplicate');
  });
  it('rejects unsupported currencies and invalid amounts', () => {
    const data = fixture();
    expect(() => validateData({ ...data, defaultCurrency: 'JPY' })).toThrow();
    for (const amountMinor of [-1, 0, 1.1, Infinity])
      expect(() =>
        validateData({ ...data, expenses: [{ ...data.expenses[0], amountMinor }] }),
      ).toThrow();
  });
  it('rejects incorrect splits, invalid dates, and self settlements', () => {
    const data = fixture();
    data.expenses[0].participants[0].amountMinor++;
    expect(() => validateData(data)).toThrow('allocations');
    const second = fixture();
    second.expenses[0].date = '2026-02-30';
    expect(() => validateData(second)).toThrow();
    const third = fixture();
    third.expenses[0].participants = [
      { memberId: 'a', amountMinor: 90000 },
      { memberId: 'b', amountMinor: 0 },
    ];
    expect(() => validateData(third)).toThrow('split method');
  });
});

it('treats an empty saved string as corrupt instead of silently replacing it', () => {
  localStorage.setItem(STORAGE_KEY, '');
  expect(loadData().error).toBeTruthy();
  expect(loadData().raw).toBe('');
  expect(localStorage.getItem(STORAGE_KEY)).toBe('');
});

it('rejects self payments and settlement references outside the group', () => {
  const data = fixture();
  const base = {
    id: 's',
    groupId: 'g',
    fromMemberId: 'a',
    toMemberId: 'a',
    amountMinor: 100,
    date: '2026-11-10',
    note: '',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  };
  expect(() => validateData({ ...data, settlements: [base] })).toThrow('themselves');
  expect(() =>
    validateData({ ...data, settlements: [{ ...base, toMemberId: 'missing' }] }),
  ).toThrow('missing group or member');
});
