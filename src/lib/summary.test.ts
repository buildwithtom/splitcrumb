import { describe, expect, it, vi } from 'vitest';
import { fixture } from './fixtures';
import { groupSummary, copyText } from './summary';
import { formatMoney } from './money';
describe('summaries and currency display', () => {
  it('formats the largest supported amount without losing its smallest unit', () => {
    expect(formatMoney(Number.MAX_SAFE_INTEGER, 'INR')).toBe('₹9,00,71,99,25,47,409.91');
    expect(formatMoney(-1, 'INR')).toBe('-₹0.01');
  });
  it('includes group, totals, balances and directional settlements', () => {
    const data = fixture();
    const text = groupSummary(data, data.groups[0]);
    expect(text).toContain('Splitcrumb — Friends');
    expect(text).toContain('Total expenses: ₹900');
    expect(text).toContain('Alex receives ₹600');
    expect(text).toContain('Sam → Alex: ₹300');
    expect(text).toContain('Every crumb counts.');
  });
  it('handles Clipboard API denial and permits a manual fallback', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    expect(await copyText('summary')).toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });
});
