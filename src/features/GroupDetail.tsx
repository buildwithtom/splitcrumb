import { dateLabel } from '../lib/dates';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  Copy,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react';
import type { Group, Expense, Settlement } from '../types';
import { useApp } from '../lib/state';
import { balances, suggestSettlements } from '../lib/balances';
import { formatMoney, sumMoney } from '../lib/money';
import { copyText, groupSummary } from '../lib/summary';
import { Avatar, AvatarStack, CategoryIcon, EmptyState, Settled } from '../components/ui';
export function ExpenseList({ group, expenses }: { group: Group; expenses: Expense[] }) {
  const { data, open, commit } = useApp();
  return (
    <div className="expense-list">
      {expenses.map((e) => (
        <div className="expense-row" key={e.id}>
          <CategoryIcon category={e.category} />
          <div className="expense-info">
            <strong>{e.description}</strong>
            <small>
              {data.members.find((m) => m.id === e.payerId)?.name} paid · {dateLabel(e.date)}
            </small>
            <span className="expense-category">
              {e.category} ·{' '}
              {e.splitMethod === 'equal'
                ? 'Split equally'
                : e.splitMethod === 'exact'
                  ? 'Exact split'
                  : 'Percentage split'}
            </span>
          </div>
          <strong className="expense-amount">{formatMoney(e.amountMinor, group.currency)}</strong>
          <div className="row-actions">
            <button
              className="icon-button"
              aria-label={`Edit expense ${e.description}`}
              onClick={() => open({ kind: 'expense', group, expense: e })}
            >
              <Pencil size={15} />
            </button>
            <button
              className="icon-button"
              aria-label={`Delete expense ${e.description}`}
              onClick={() =>
                open({
                  kind: 'confirm',
                  title: 'Delete this expense?',
                  description: `“${e.description}” will be removed and all balances will be recalculated.`,
                  danger: true,
                  action: () =>
                    commit(
                      { ...data, expenses: data.expenses.filter((v) => v.id !== e.id) },
                      'Expense deleted. Balances recalculated.',
                    ),
                })
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
function SettlementList({ group, records }: { group: Group; records: Settlement[] }) {
  const { data, open, commit } = useApp();
  const name = (id: string) => data.members.find((m) => m.id === id)?.name;
  return (
    <div className="expense-list">
      {records.map((s) => (
        <div className="expense-row" key={s.id}>
          <span className="category-icon cat-settlement">
            <CheckCheck size={20} />
          </span>
          <div className="expense-info">
            <strong>
              {name(s.fromMemberId)} paid {name(s.toMemberId)}
            </strong>
            <small>{dateLabel(s.date)} · Settlement</small>
            {s.note && <span className="expense-category">{s.note}</span>}
          </div>
          <strong className="expense-amount lime">
            {formatMoney(s.amountMinor, group.currency)}
          </strong>
          <div className="row-actions">
            <button
              className="icon-button"
              aria-label={`Edit settlement ${name(s.fromMemberId)} to ${name(s.toMemberId)}`}
              onClick={() => open({ kind: 'settlement', group, settlement: s })}
            >
              <Pencil size={15} />
            </button>
            <button
              className="icon-button"
              aria-label={`Delete settlement ${name(s.fromMemberId)} to ${name(s.toMemberId)}`}
              onClick={() =>
                open({
                  kind: 'confirm',
                  title: 'Delete this settlement?',
                  description:
                    'This recorded payment will be removed and balances will be recalculated.',
                  danger: true,
                  action: () =>
                    commit(
                      { ...data, settlements: data.settlements.filter((v) => v.id !== s.id) },
                      'Settlement deleted.',
                    ),
                })
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
export function BalancePanel({ group, detailed = false }: { group: Group; detailed?: boolean }) {
  const { data, open } = useApp();
  const members = data.members.filter((m) => m.groupId === group.id),
    net = balances(data, group.id);
  return (
    <div className="balance-list">
      {members.map((m) => {
        const n = net[m.id] ?? 0;
        return (
          <div className="balance-row" key={m.id}>
            <Avatar member={m} />
            <div className="balance-person">
              <strong>{m.name}</strong>
              <small>{n > 0 ? 'Gets back' : n < 0 ? 'Owes' : 'All settled up'}</small>
            </div>
            <div className={`balance-value ${n > 0 ? 'lime' : n < 0 ? 'negative' : 'muted'}`}>
              <strong>{formatMoney(Math.abs(n), group.currency)}</strong>
              {detailed && (
                <small>
                  Owed: {formatMoney(Math.max(0, -n), group.currency)}
                  <br />
                  Receivable: {formatMoney(Math.max(0, n), group.currency)}
                  <br />
                  Net: {n > 0 ? '+' : n < 0 ? '−' : ''}
                  {formatMoney(Math.abs(n), group.currency)}
                </small>
              )}
            </div>
          </div>
        );
      })}
      {!members.length && (
        <EmptyState
          compact
          title="Who’s coming?"
          text="Add your people to start splitting."
          action={
            <button className="text-button" onClick={() => open({ kind: 'members', group })}>
              Add members
              <Plus size={15} />
            </button>
          }
        />
      )}
    </div>
  );
}
export function Suggestions({ group }: { group: Group }) {
  const { data, open } = useApp();
  const suggestions = suggestSettlements(balances(data, group.id));
  const name = (id: string) => data.members.find((m) => m.id === id)?.name;
  return (
    <div className="suggestions">
      {suggestions.length ? (
        suggestions.map((s) => (
          <div className="suggestion" key={`${s.fromMemberId}-${s.toMemberId}`}>
            <div>
              <strong>
                {name(s.fromMemberId)}
                <ArrowRight size={14} />
                {name(s.toMemberId)}
              </strong>
              <small>
                {name(s.fromMemberId)} pays {name(s.toMemberId)}{' '}
                {formatMoney(s.amountMinor, group.currency)}
              </small>
            </div>
            <button
              className="button small secondary"
              onClick={() => open({ kind: 'settlement', group, transfer: s })}
            >
              Settle
              <ArrowUpRight size={14} />
            </button>
          </div>
        ))
      ) : (
        <Settled />
      )}
      <p className="small-text muted">
        Simple suggestions based on everyone’s net balance. Record full or partial payments when you
        settle.
      </p>
    </div>
  );
}
export function GroupDetail() {
  const { id } = useParams();
  const { data, open, commit, notify } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState('expenses');
  const [search, setSearch] = useState('');
  const group = data.groups.find((g) => g.id === id);
  if (!group)
    return (
      <EmptyState
        title="This group isn’t here."
        text="It may have been deleted, or the link has changed."
        action={
          <Link className="button primary" to="/">
            Back to overview
          </Link>
        }
      />
    );
  const members = data.members.filter((m) => m.groupId === id);
  const expenses = data.expenses
    .filter((e) => e.groupId === id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const settlements = data.settlements
    .filter((s) => s.groupId === id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = sumMoney(expenses.map((e) => e.amountMinor));
  const copy = async () => {
    const text = groupSummary(data, group);
    if (await copyText(text)) notify('Settlement summary copied.');
    else open({ kind: 'summary', text });
  };
  return (
    <>
      <Link to="/groups" className="text-button back-link">
        <ArrowLeft size={16} /> All groups
      </Link>
      <div className="page-heading group-heading">
        <div>
          <div className="eyebrow">A SHARED LITTLE STORY · {group.currency}</div>
          <h1>{group.name}</h1>
          <div className="group-members-line">
            <AvatarStack members={members} />
            <button className="text-button muted" onClick={() => open({ kind: 'members', group })}>
              {members.length} friends
              <Settings2 size={14} />
            </button>
          </div>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={copy}>
            <Copy size={16} /> Share summary
          </button>
          <button
            className="button primary"
            onClick={() => open({ kind: 'expense', group })}
            disabled={!members.length}
          >
            <Plus size={17} /> Add expense
          </button>
        </div>
      </div>
      <div className="group-summary-bar">
        <div>
          <small>Total group spending</small>
          <strong>{formatMoney(total, group.currency)}</strong>
        </div>
        <div>
          <small>Shared expenses</small>
          <strong>{expenses.length.toString().padStart(2, '0')}</strong>
        </div>
        <div>
          <small>Payments recorded</small>
          <strong>{settlements.length.toString().padStart(2, '0')}</strong>
        </div>
        <button
          className="button secondary"
          onClick={() => open({ kind: 'settlement', group })}
          disabled={members.length < 2}
        >
          <CheckCheck size={17} /> Settle up
        </button>
      </div>
      <div className="group-columns">
        <section className="panel transactions">
          <div className="tabs" role="tablist" aria-label="Group views">
            {['expenses', 'balances', 'settlements'].map((t) => (
              <button
                key={t}
                role="tab"
                tabIndex={tab === t ? 0 : -1}
                onKeyDown={(e) => {
                  const tabs = ['expenses', 'balances', 'settlements'];
                  const index = tabs.indexOf(t);
                  const next =
                    e.key === 'ArrowRight'
                      ? tabs[(index + 1) % 3]
                      : e.key === 'ArrowLeft'
                        ? tabs[(index + 2) % 3]
                        : e.key === 'Home'
                          ? tabs[0]
                          : e.key === 'End'
                            ? tabs[2]
                            : null;
                  if (next) {
                    e.preventDefault();
                    setTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  }
                }}
                aria-selected={tab === t}
                aria-controls={`group-${t}`}
                id={`tab-${t}`}
                onClick={() => setTab(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
                {t === 'expenses' && <span className="count">{expenses.length}</span>}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`group-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'expenses' && (
              <>
                <div className="transaction-toolbar">
                  <h2>The shared tab</h2>
                  <label className="search">
                    <Search size={16} />
                    <input
                      placeholder="Find an expense"
                      aria-label="Find an expense"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                {expenses.length ? (
                  <>
                    <ExpenseList
                      group={group}
                      expenses={expenses.filter((e) =>
                        e.description.toLowerCase().includes(search.toLowerCase()),
                      )}
                    />
                    {!expenses.some((e) =>
                      e.description.toLowerCase().includes(search.toLowerCase()),
                    ) && <p className="no-results">No expenses match your search.</p>}
                  </>
                ) : (
                  <EmptyState
                    title="The first one’s on someone."
                    text="Add your first shared expense. We’ll handle the rest."
                    action={
                      <button
                        className="button primary"
                        disabled={!members.length}
                        onClick={() => open({ kind: 'expense', group })}
                      >
                        <Plus size={16} /> Add an expense
                      </button>
                    }
                  />
                )}
              </>
            )}
            {tab === 'balances' && (
              <div className="tab-padding">
                <h2>Everyone’s piece of the pie</h2>
                <p className="muted small-text">
                  Current net positions, including recorded settlements.
                </p>
                <BalancePanel group={group} detailed />
                <h2 className="spaced-heading">The way to all square</h2>
                <Suggestions group={group} />
              </div>
            )}
            {tab === 'settlements' && (
              <>
                <div className="transaction-toolbar">
                  <h2>Squared away</h2>
                  <button
                    className="text-button"
                    disabled={members.length < 2}
                    onClick={() => open({ kind: 'settlement', group })}
                  >
                    <Plus size={16} /> Record payment
                  </button>
                </div>
                {settlements.length ? (
                  <SettlementList group={group} records={settlements} />
                ) : (
                  <EmptyState
                    title="No payments recorded yet."
                    text="When money changes hands, record it here."
                  />
                )}
              </>
            )}
          </div>
        </section>
        <aside>
          <section className="panel">
            <div className="panel-heading">
              <h2>A fair share</h2>
              <Users size={17} />
            </div>
            <BalancePanel group={group} />
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Let’s square up</h2>
              <CheckCheck size={18} />
            </div>
            <Suggestions group={group} />
          </section>
          <div className="group-settings">
            <button className="text-button muted" onClick={() => open({ kind: 'group', group })}>
              <Pencil size={14} /> Edit group
            </button>
            <button
              className="text-button muted"
              onClick={() =>
                open({
                  kind: 'confirm',
                  title: `Delete ${group.name}?`,
                  description:
                    'This permanently removes the group, its members, expenses, and settlements. Export a backup from Settings if you want to keep a copy.',
                  danger: true,
                  action: () => {
                    if (
                      commit(
                        {
                          ...data,
                          groups: data.groups.filter((g) => g.id !== id),
                          members: data.members.filter((m) => m.groupId !== id),
                          expenses: data.expenses.filter((e) => e.groupId !== id),
                          settlements: data.settlements.filter((s) => s.groupId !== id),
                        },
                        'Group deleted.',
                      )
                    )
                      navigate('/');
                  },
                })
              }
            >
              <Trash2 size={14} /> Delete group
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
