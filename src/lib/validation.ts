import { z } from 'zod';
import { categories, currencies } from '../types';
import { equalSplit, percentageSplit } from './splits';
const id = z.string().min(1).max(200);
const name = z.string().trim().min(1).max(80);
const timestamp = z.iso.datetime();
const date = z.iso.date();
const minor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const positive = minor.refine((v) => v > 0, 'Amount must be positive.');
export const dataSchema = z
  .object({
    version: z.literal(1),
    defaultCurrency: z.enum(currencies),
    groups: z.array(
      z.object({
        currencyLocked: z.boolean().optional(),
        id,
        name,
        currency: z.enum(currencies),
        memberIds: z.array(id),
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    ),
    members: z.array(
      z.object({
        id,
        groupId: id,
        name,
        avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        createdAt: timestamp,
      }),
    ),
    expenses: z.array(
      z.object({
        id,
        groupId: id,
        description: name,
        category: z.enum(categories),
        amountMinor: positive,
        payerId: id,
        participants: z
          .array(
            z.object({
              memberId: id,
              amountMinor: minor,
              basisPoints: z.number().int().min(0).max(10000).optional(),
            }),
          )
          .min(1),
        splitMethod: z.enum(['equal', 'exact', 'percentage']),
        date,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    ),
    settlements: z.array(
      z.object({
        id,
        groupId: id,
        fromMemberId: id,
        toMemberId: id,
        amountMinor: positive,
        date,
        note: z.string().max(300),
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    ),
  })
  .superRefine((data, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    const ids = [...data.groups, ...data.members, ...data.expenses, ...data.settlements].map(
      (v) => v.id,
    );
    if (new Set(ids).size !== ids.length) issue('Record IDs must be unique.');
    const groups = new Map(data.groups.map((g) => [g.id, g]));
    const members = new Map(data.members.map((m) => [m.id, m]));
    for (const g of data.groups) {
      if (new Set(g.memberIds).size !== g.memberIds.length)
        issue('A group lists a member more than once.');
      if (g.memberIds.some((id) => members.get(id)?.groupId !== g.id))
        issue('A group refers to a missing member.');
    }
    for (const m of data.members)
      if (!groups.get(m.groupId)?.memberIds.includes(m.id))
        issue('A member has no matching group.');
    for (const e of data.expenses) {
      const refs = [e.payerId, ...e.participants.map((p) => p.memberId)];
      if (!groups.has(e.groupId) || refs.some((id) => members.get(id)?.groupId !== e.groupId))
        issue('An expense refers to a missing group or member.');
      if (new Set(e.participants.map((p) => p.memberId)).size !== e.participants.length)
        issue('An expense has duplicate participants.');
      if (e.participants.reduce((n, p) => n + BigInt(p.amountMinor), 0n) !== BigInt(e.amountMinor))
        issue('Expense allocations do not match the total.');
      try {
        const ids = e.participants.map((p) => p.memberId);
        const expected =
          e.splitMethod === 'equal'
            ? equalSplit(e.amountMinor, ids)
            : e.splitMethod === 'percentage'
              ? percentageSplit(
                  e.amountMinor,
                  ids,
                  Object.fromEntries(
                    e.participants.map((p) => [p.memberId, String((p.basisPoints ?? -1) / 100)]),
                  ),
                )
              : null;
        if (
          expected &&
          expected.some(
            (p) =>
              e.participants.find((s) => s.memberId === p.memberId)?.amountMinor !== p.amountMinor,
          )
        )
          issue('Split allocations do not match the split method.');
      } catch {
        issue('The expense split is invalid.');
      }
    }
    for (const s of data.settlements) {
      if (
        !groups.has(s.groupId) ||
        [s.fromMemberId, s.toMemberId].some((id) => members.get(id)?.groupId !== s.groupId)
      )
        issue('A settlement refers to a missing group or member.');
      if (s.fromMemberId === s.toMemberId) issue('A member cannot settle with themselves.');
    }
    // Bound total movement so every derived sum and balance stays a safe integer.
    if (
      [...data.expenses, ...data.settlements].reduce((n, r) => n + BigInt(r.amountMinor), 0n) >
      BigInt(Number.MAX_SAFE_INTEGER)
    )
      issue('Combined transactions exceed the safe numeric limit.');
  });
export function validateData(value: unknown) {
  const result = dataSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      `Invalid Splitcrumb data: ${result.error.issues[0]?.message ?? 'Unsupported format.'}`,
    );
  return result.data;
}
