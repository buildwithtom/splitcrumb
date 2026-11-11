import type { AppData, Group } from '../types';
import { balances, suggestSettlements } from './balances';
import { formatMoney, sumMoney } from './money';
export function groupSummary(data: AppData, group: Group) {
  const memberName = (id: string) =>
    data.members.find((m) => m.id === id)?.name ?? 'Unknown member';
  const money = (n: number) => formatMoney(n, group.currency);
  const net = balances(data, group.id),
    suggestions = suggestSettlements(net);
  return [
    `Splitcrumb — ${group.name}`,
    '',
    `Total expenses: ${money(sumMoney(data.expenses.filter((e) => e.groupId === group.id).map((e) => e.amountMinor)))}`,
    '',
    'Balances:',
    ...Object.entries(net).map(
      ([id, n]) =>
        `${memberName(id)} ${n > 0 ? 'receives' : n < 0 ? 'owes' : 'is settled up'}${n ? ` ${money(Math.abs(n))}` : ''}`,
    ),
    '',
    'Suggested settlements:',
    ...suggestions.map(
      (s) => `${memberName(s.fromMemberId)} → ${memberName(s.toMemberId)}: ${money(s.amountMinor)}`,
    ),
    ...(!suggestions.length ? ['Not a crumb owed!'] : []),
    '',
    'Every crumb counts.',
  ].join('\n');
}
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Try legacy clipboard, then offer selectable text. */
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
