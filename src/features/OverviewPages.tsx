import { dateLabel } from '../lib/dates';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCheck, Plus } from 'lucide-react';
import { useApp } from '../lib/state';
import { BalancePanel, Suggestions } from './GroupDetail';
import { CategoryIcon, EmptyState } from '../components/ui';
import { formatMoney } from '../lib/money';
export function BalancesPage() {
  const { data, open } = useApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">KEEP THE FRIENDSHIP. LOSE THE MATH.</div>
          <h1>A little closer to all square.</h1>
          <p>Everyone’s fair share, one group at a time.</p>
        </div>
      </div>
      {!data.groups.length ? (
        <EmptyState
          title="A fresh slate."
          text="Create a group and add an expense to see balances here."
          action={
            <button className="button primary" onClick={() => open({ kind: 'group' })}>
              <Plus size={16} /> Create group
            </button>
          }
        />
      ) : (
        <div className="balances-grid">
          {data.groups.map((g) => (
            <section className="panel" key={g.id}>
              <div className="panel-heading">
                <Link to={`/groups/${g.id}`}>
                  <h2>
                    {g.name}
                    <ArrowRight size={16} />
                  </h2>
                </Link>
                <span className="currency-pill">{g.currency}</span>
              </div>
              <BalancePanel group={g} detailed />
              <div className="balance-suggestions">
                <h3>Suggested payments</h3>
                <Suggestions group={g} />
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
export function ActivityPage() {
  const { data } = useApp();
  const entries = [
    ...data.expenses.map((e) => ({ ...e, type: 'expense' as const })),
    ...data.settlements.map((s) => ({ ...s, type: 'settlement' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE MOMENTS ADD UP</div>
          <h1>Your shared story.</h1>
          <p>Every expense and every little “we’re even”.</p>
        </div>
      </div>
      <section className="panel full-activity">
        {entries.length ? (
          entries.map((entry) => {
            const group = data.groups.find((g) => g.id === entry.groupId)!;
            const name = (id: string) => data.members.find((m) => m.id === id)?.name;
            return (
              <Link to={`/groups/${group.id}`} className="expense-row" key={entry.id}>
                {entry.type === 'expense' ? (
                  <CategoryIcon category={entry.category} />
                ) : (
                  <span className="category-icon cat-settlement">
                    <CheckCheck size={20} />
                  </span>
                )}
                <div className="expense-info">
                  <strong>
                    {entry.type === 'expense'
                      ? entry.description
                      : `${name(entry.fromMemberId)} paid ${name(entry.toMemberId)}`}
                  </strong>
                  <small>
                    {group.name} · {dateLabel(entry.date)}
                  </small>
                  <span className="expense-category">
                    {entry.type === 'expense'
                      ? `${name(entry.payerId)} paid`
                      : 'Settlement recorded'}
                  </span>
                </div>
                <strong className={`expense-amount ${entry.type === 'settlement' ? 'lime' : ''}`}>
                  {formatMoney(entry.amountMinor, group.currency)}
                </strong>
                <ArrowRight size={16} className="muted" />
              </Link>
            );
          })
        ) : (
          <EmptyState
            title="A fresh little start."
            text="Once you add an expense, your shared story begins here."
            action={
              <Link className="button primary" to="/groups">
                Go to your groups
                <ArrowRight size={16} />
              </Link>
            }
          />
        )}
      </section>
    </>
  );
}
