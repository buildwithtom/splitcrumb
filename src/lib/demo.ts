import type { AppData, Expense, Group, Member } from '../types';
import { equalSplit } from './splits';
import { avatarColors, uid, today } from './state';
export function sampleData(base: AppData): AppData {
  const now = new Date().toISOString();
  const groups: Group[] = [],
    members: Member[] = [],
    expenses: Expense[] = [];
  const examples = [
    {
      name: 'The Goa getaway',
      names: ['Alex', 'Sam', 'Tom', 'Maya'],
      items: [
        {
          description: 'A little place by the sea',
          amount: 1800000,
          category: 'Accommodation' as const,
        },
        {
          description: 'Dinner at the beach shack',
          amount: 480000,
          category: 'Food & Drinks' as const,
        },
        { description: 'Scooters for the weekend', amount: 240000, category: 'Travel' as const },
      ],
    },
    {
      name: 'Our happy place',
      names: ['Alex', 'Sam', 'Maya'],
      items: [
        {
          description: 'Groceries & the good coffee',
          amount: 365000,
          category: 'Shopping' as const,
        },
        { description: 'This month’s Wi-Fi', amount: 150000, category: 'Utilities' as const },
      ],
    },
    {
      name: 'Friday people',
      names: ['Alex', 'Tom', 'Maya', 'Sam', 'Riya'],
      items: [
        { description: 'Pizza, obviously', amount: 285000, category: 'Food & Drinks' as const },
      ],
    },
  ];
  examples.forEach((example, i) => {
    const groupId = uid();
    const ms = example.names.map((name, j) => ({
      id: uid(),
      groupId,
      name,
      avatarColor: avatarColors[j % avatarColors.length],
      createdAt: now,
    }));
    members.push(...ms);
    groups.push({
      id: groupId,
      name: example.name,
      currency: 'INR',
      memberIds: ms.map((m) => m.id),
      createdAt: now,
      updatedAt: now,
    });
    example.items.forEach((item, j) =>
      expenses.push({
        id: uid(),
        groupId,
        description: item.description,
        category: item.category,
        amountMinor: item.amount,
        payerId: ms[(j + i) % ms.length].id,
        participants: equalSplit(
          item.amount,
          ms.map((m) => m.id),
        ),
        splitMethod: 'equal',
        date: today(),
        createdAt: now,
        updatedAt: now,
      }),
    );
  });
  return {
    ...base,
    groups: [...base.groups, ...groups],
    members: [...base.members, ...members],
    expenses: [...base.expenses, ...expenses],
  };
}
