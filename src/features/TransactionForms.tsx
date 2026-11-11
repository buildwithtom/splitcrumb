import { useState, type FormEvent } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import {
  categories,
  type Expense,
  type Group,
  type Share,
  type SplitMethod,
  type Settlement,
  type Transfer,
} from '../types';
import { today, uid, useApp } from '../lib/state';
import { formatMoney, moneyInput, parseMoney } from '../lib/money';
import { equalSplit, exactSplit, percentageSplit } from '../lib/splits';
import { balances } from '../lib/balances';
import { Avatar, Field, FormError } from '../components/ui';
export function ExpenseForm({
  group,
  expense,
  close,
}: {
  group: Group;
  expense?: Expense;
  close: () => void;
}) {
  const { data, commit } = useApp();
  const members = data.members.filter((m) => m.groupId === group.id);
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? moneyInput(expense.amountMinor) : '');
  const [category, setCategory] = useState(expense?.category ?? categories[0]);
  const [date, setDate] = useState(expense?.date ?? today());
  const [payer, setPayer] = useState(expense?.payerId ?? members[0]?.id ?? '');
  const [participants, setParticipants] = useState(
    expense?.participants.map((p) => p.memberId) ?? members.map((m) => m.id),
  );
  const [method, setMethod] = useState<SplitMethod>(expense?.splitMethod ?? 'equal');
  const [exactValues, setExactValues] = useState<Record<string, string>>(
    Object.fromEntries(
      expense?.participants.map((p) => [p.memberId, moneyInput(p.amountMinor)]) ?? [],
    ),
  );
  const [percentValues, setPercentValues] = useState<Record<string, string>>(
    Object.fromEntries(
      expense?.participants.map((p) => [
        p.memberId,
        p.basisPoints !== undefined ? (p.basisPoints / 100).toFixed(2) : '',
      ]) ?? [],
    ),
  );
  const [error, setError] = useState('');
  let shares: Share[] = [],
    splitError = '';
  try {
    const total = parseMoney(amount);
    shares =
      method === 'equal'
        ? equalSplit(total, participants)
        : method === 'exact'
          ? exactSplit(total, participants, exactValues)
          : percentageSplit(total, participants, percentValues);
  } catch (e) {
    splitError = (e as Error).message;
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) return setError('What was this expense for?');
    if (splitError) return setError(splitError);
    if (!members.some((m) => m.id === payer)) return setError('Choose who paid.');
    const now = new Date().toISOString();
    const record: Expense = {
      id: expense?.id ?? uid(),
      groupId: group.id,
      description: description.trim(),
      category,
      amountMinor: parseMoney(amount),
      payerId: payer,
      participants: shares,
      splitMethod: method,
      date,
      createdAt: expense?.createdAt ?? now,
      updatedAt: now,
    };
    if (
      commit(
        {
          ...data,
          expenses: expense
            ? data.expenses.map((e) => (e.id === expense.id ? record : e))
            : [...data.expenses, record],
          groups: data.groups.map((g) =>
            g.id === group.id ? { ...g, currencyLocked: true, updatedAt: now } : g,
          ),
        },
        expense
          ? 'Expense updated. Balances recalculated.'
          : 'Expense added. That’s one less thing to work out.',
      )
    )
      close();
  }
  return (
    <form onSubmit={submit}>
      <Field label="What was it for?">
        <input
          autoFocus
          required
          maxLength={80}
          placeholder="Dinner, a weekend away, the good coffee…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="form-grid">
        <Field label={`Amount (${group.currency})`}>
          <input
            required
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
            }}
            aria-describedby="allocation-status"
          />
        </Field>
        <Field label="Date">
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Paid by">
          <select value={payer} onChange={(e) => setPayer(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}{' '}
                {members.filter((n) => n.name === m.name).length > 1 ? `(${m.id.slice(0, 4)})` : ''}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset>
        <legend>How are we splitting?</legend>
        <div className="segmented" aria-label="Split method">
          {(['equal', 'exact', 'percentage'] as const).map((v) => (
            <button
              type="button"
              key={v}
              aria-pressed={method === v}
              className={method === v ? 'active' : ''}
              onClick={() => {
                setMethod(v);
                setError('');
              }}
            >
              {v === 'equal' ? 'Equally' : v === 'exact' ? 'Exact amounts' : 'Percentages'}
            </button>
          ))}
        </div>
        <div className="split-members">
          {members.map((m) => (
            <div className="split-row" key={m.id}>
              <label className="check-member">
                <input
                  type="checkbox"
                  checked={participants.includes(m.id)}
                  onChange={(e) => {
                    setParticipants(
                      e.target.checked
                        ? [...participants, m.id]
                        : participants.filter((id) => id !== m.id),
                    );
                    setError('');
                  }}
                />
                <Avatar member={m} size="tiny" />
                <span>
                  {m.name}
                  <small>{m.id === payer ? 'Paid the bill' : 'Participant'}</small>
                </span>
              </label>
              {participants.includes(m.id) &&
                (method === 'equal' ? (
                  <span className="allocation">
                    {shares.length
                      ? formatMoney(
                          shares.find((s) => s.memberId === m.id)?.amountMinor ?? 0,
                          group.currency,
                        )
                      : '—'}
                  </span>
                ) : (
                  <div className="allocation-input">
                    <input
                      inputMode="decimal"
                      aria-label={`${method === 'exact' ? 'Amount' : 'Percentage'} for ${m.name} (${m.id.slice(0, 4)})`}
                      placeholder={method === 'exact' ? '0.00' : '0'}
                      value={(method === 'exact' ? exactValues : percentValues)[m.id] ?? ''}
                      onChange={(e) => {
                        const setter = method === 'exact' ? setExactValues : setPercentValues;
                        setter((v) => ({ ...v, [m.id]: e.target.value }));
                        setError('');
                      }}
                    />
                    {method === 'percentage' && <span>%</span>}
                  </div>
                ))}
            </div>
          ))}
        </div>
        <div
          id="allocation-status"
          className={`allocation-status ${amount && splitError ? 'invalid' : ''}`}
          aria-live="polite"
        >
          {amount
            ? splitError || (
                <>
                  <Check size={15} /> All accounted for ·{' '}
                  {formatMoney(parseMoney(amount), group.currency)}
                </>
              )
            : 'Add an amount to see everyone’s share.'}
        </div>
        {method !== 'equal' && !splitError && (
          <div className="allocation-preview">
            {shares.map((s) => (
              <span key={s.memberId}>
                {members.find((m) => m.id === s.memberId)?.name}:{' '}
                {formatMoney(s.amountMinor, group.currency)}
              </span>
            ))}
          </div>
        )}
      </fieldset>
      <FormError error={error} />
      <div className="form-footer">
        <button type="button" className="button secondary" onClick={close}>
          Cancel
        </button>
        <button className="button primary" type="submit" disabled={!members.length}>
          {expense ? 'Save changes' : 'Add expense'}
          <Check size={17} />
        </button>
      </div>
    </form>
  );
}
export function SettlementForm({
  group,
  settlement,
  transfer,
  close,
}: {
  group: Group;
  settlement?: Settlement;
  transfer?: Transfer;
  close: () => void;
}) {
  const { data, commit } = useApp();
  const members = data.members.filter((m) => m.groupId === group.id);
  const [from, setFrom] = useState(
    settlement?.fromMemberId ?? transfer?.fromMemberId ?? members[0]?.id ?? '',
  );
  const [to, setTo] = useState(
    settlement?.toMemberId ?? transfer?.toMemberId ?? members[1]?.id ?? '',
  );
  const [amount, setAmount] = useState(
    settlement || transfer ? moneyInput((settlement ?? transfer)!.amountMinor) : '',
  );
  const [date, setDate] = useState(settlement?.date ?? today());
  const [note, setNote] = useState(settlement?.note ?? '');
  const [error, setError] = useState('');
  const net = balances(
    { ...data, settlements: data.settlements.filter((s) => s.id !== settlement?.id) },
    group.id,
  );
  const suggested = Math.max(0, Math.min(-(net[from] ?? 0), net[to] ?? 0));
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (!from || !to || from === to) throw new Error('Choose two different members.');
      const amountMinor = parseMoney(amount),
        now = new Date().toISOString();
      const record: Settlement = {
        id: settlement?.id ?? uid(),
        groupId: group.id,
        fromMemberId: from,
        toMemberId: to,
        amountMinor,
        date,
        note: note.trim(),
        createdAt: settlement?.createdAt ?? now,
        updatedAt: now,
      };
      if (
        commit(
          {
            ...data,
            settlements: settlement
              ? data.settlements.map((s) => (s.id === settlement.id ? record : s))
              : [...data.settlements, record],
            groups: data.groups.map((g) =>
              g.id === group.id ? { ...g, currencyLocked: true, updatedAt: now } : g,
            ),
          },
          'Settlement recorded. A little more squared away.',
        )
      )
        close();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form onSubmit={submit}>
      <p className="info-note">
        Record a payment you’ve already made. Full or partial, every bit counts. No money moves
        through Splitcrumb.
      </p>
      <div className="form-grid">
        <Field label="Who paid?">
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.id.slice(0, 4)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Who received?">
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.id.slice(0, 4)})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={`Amount (${group.currency})`}>
        <input
          autoFocus
          required
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      {suggested > 0 && (
        <button
          type="button"
          className="text-button full-settlement"
          onClick={() => setAmount(moneyInput(suggested))}
        >
          Use full suggested payment: {formatMoney(suggested, group.currency)}
          <ArrowRight size={15} />
        </button>
      )}
      <div className="form-grid">
        <Field label="Payment date">
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <input
            maxLength={300}
            placeholder="e.g. Bank transfer"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
      <FormError error={error} />
      <div className="form-footer">
        <button type="button" className="button secondary" onClick={close}>
          Cancel
        </button>
        <button className="button primary" type="submit" disabled={members.length < 2}>
          Record settlement
          <Check size={17} />
        </button>
      </div>
    </form>
  );
}
