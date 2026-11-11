import { dateLabel } from '../lib/dates';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  ChevronRight,
  CirclePlus,
  Coffee,
  FolderHeart,
  Leaf,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { useApp } from '../lib/state';
import { currencyTotals, balances, suggestSettlements } from '../lib/balances';
import { formatMoney, sumMoney } from '../lib/money';
import { sampleData } from '../lib/demo';
import { AvatarStack, CategoryIcon } from '../components/ui';
import type { Group } from '../types';
export function CrumbArt() {
  return (
    <svg className="crumb-art" viewBox="0 0 300 240" aria-hidden="true">
      <g fill="none" stroke="#BEF264" strokeWidth="1">
        <circle cx="161" cy="122" r="91" opacity=".12" />
        <circle cx="161" cy="122" r="109" opacity=".07" />
      </g>
      <g transform="rotate(-18 150 120)">
        <path d="M140 40a80 80 0 0 0-2 159V40Z" fill="#BEF264" />
        <path d="M151 38v70h78a81 81 0 0 0-78-70Z" fill="#D9F99D" />
        <path d="M153 122v78a79 79 0 0 0 77-78Z" fill="#83B847" />
      </g>
      <rect x="30" y="159" width="82" height="37" rx="18" fill="#2B3848" stroke="#43513F" />
      <path d="m44 177 5 5 9-10" stroke="#BEF264" strokeWidth="2" fill="none" />
      <text x="64" y="181" fill="#F9FAFB" fontFamily="sans-serif" fontSize="11">
        All square
      </text>
      <circle cx="251" cy="60" r="5" fill="#BEF264" />
      <circle cx="68" cy="65" r="3" fill="#BEF264" opacity=".5" />
      <path d="M247 186v12m-6-6h12" stroke="#BEF264" strokeWidth="1.5" />
    </svg>
  );
}
export function GroupCard({ group, index }: { group: Group; index: number }) {
  const { data } = useApp();
  const members = data.members.filter((m) => m.groupId === group.id);
  const expenses = data.expenses.filter((e) => e.groupId === group.id);
  const net = balances(data, group.id);
  const owed = sumMoney(Object.values(net).filter((v) => v > 0));
  const Icon = [Leaf, Coffee, Sparkles][index % 3];
  return (
    <Link to={`/groups/${group.id}`} className="group-card">
      <div className="group-card-top">
        <span className={`group-icon tone-${index % 3}`}>
          <Icon size={24} strokeWidth={1.6} />
        </span>
        <span className="currency-pill">{group.currency}</span>
        <ArrowUpRight size={19} className="card-arrow" />
      </div>
      <h3>{group.name}</h3>
      <p className="muted small-text">
        {members.length} friends · {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
      </p>
      <div className="group-spend">
        <small>Total spent</small>
        <strong>{formatMoney(sumMoney(expenses.map((e) => e.amountMinor)), group.currency)}</strong>
      </div>
      <div className="group-card-bottom">
        <AvatarStack members={members} />
        <span className={owed ? 'balance-label' : 'balance-label lime'}>
          {owed ? (
            `${formatMoney(owed, group.currency)} to settle`
          ) : (
            <>
              <CheckCheck size={14} /> All settled up
            </>
          )}
        </span>
      </div>
    </Link>
  );
}
export function Dashboard({ groupsOnly = false }: { groupsOnly?: boolean }) {
  const { data, open, commit } = useApp();
  const [search, setSearch] = useState('');
  const totals = currencyTotals(data);
  const recent = [
    ...data.expenses.map((e) => ({ ...e, type: 'expense' as const })),
    ...data.settlements.map((s) => ({ ...s, type: 'settlement' as const })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const transfers = data.groups.reduce(
    (n, g) => n + suggestSettlements(balances(data, g.id)).length,
    0,
  );
  const filtered = data.groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LESS MATH. MORE MEMORIES.</div>
          <h1>{groupsOnly ? 'Your groups' : 'The good times, at a glance.'}</h1>
          <p>
            {groupsOnly
              ? 'Different people. Shared moments. Everything in one place.'
              : 'A little clarity for everything you share.'}
          </p>
        </div>
        <button className="button primary" onClick={() => open({ kind: 'group' })}>
          <Plus size={18} /> Create group
        </button>
      </div>
      {!groupsOnly && (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="hero-pill">
                <span /> MADE FOR LIFE, SHARED
              </span>
              <h2>
                Make memories.
                <br />
                Split the <span>little things.</span>
              </h2>
              <p>
                From the first coffee to the last beach day.
                <br className="desktop-break" /> We’ll take care of who owes what.
              </p>
              <button className="text-button" onClick={() => open({ kind: 'group' })}>
                Start something together
                <ArrowRight size={17} />
              </button>
            </div>
            <CrumbArt />
          </section>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">
                <Wallet size={19} />
              </span>
              <div>
                <small>Total shared expenses</small>
                <div className="total-values">
                  {Object.entries(totals).length ? (
                    Object.entries(totals).map(([c, v]) => (
                      <strong key={c}>
                        {formatMoney(v, c as typeof data.defaultCurrency)}
                        <em>{c}</em>
                      </strong>
                    ))
                  ) : (
                    <strong>
                      {formatMoney(0, data.defaultCurrency)}
                      <em>{data.defaultCurrency}</em>
                    </strong>
                  )}
                </div>
                <p>Good times, accounted for</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">
                <Users size={19} />
              </span>
              <div>
                <small>Your circles</small>
                <strong>
                  {String(data.groups.length).padStart(2, '0')}
                  <em>groups</em>
                </strong>
                <p>A place for every shared story</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">
                <ArrowDownLeft size={19} />
              </span>
              <div>
                <small>A little left to settle</small>
                <strong>
                  {String(transfers).padStart(2, '0')}
                  <em>payments</em>
                </strong>
                <p>
                  {transfers
                    ? 'A few small steps to all square'
                    : 'A fresh start. Feels good, right?'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      <div className={`dashboard-columns ${groupsOnly ? 'wide' : ''}`}>
        <section>
          <div className="section-heading">
            <h2>
              Your groups <span className="count">{data.groups.length}</span>
            </h2>
            {!groupsOnly && data.groups.length > 0 && (
              <Link className="text-button muted" to="/groups">
                View all
                <ArrowRight size={15} />
              </Link>
            )}
            {groupsOnly && (
              <label className="search">
                <Search size={17} />
                <input
                  placeholder="Find a group"
                  aria-label="Find a group"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            )}
          </div>
          {data.groups.length ? (
            <div className="groups-grid">
              {filtered.map((g, i) => (
                <GroupCard key={g.id} group={g} index={i} />
              ))}
              {!filtered.length && <p className="muted">No groups match “{search}”.</p>}
              <button className="new-group-card" onClick={() => open({ kind: 'group' })}>
                <span>
                  <Plus size={22} />
                </span>
                <strong>A new shared story</strong>
                <small>Create another group</small>
              </button>
            </div>
          ) : (
            <div className="welcome-empty">
              <div className="overlapping-circles">
                <span />
                <span />
                <span>
                  <Users size={25} />
                </span>
              </div>
              <h2>Good times are better shared.</h2>
              <p>
                Create a group, add your friends,
                <br />
                and leave the math to us.
              </p>
              <button className="button primary" onClick={() => open({ kind: 'group' })}>
                <Plus size={17} /> Create your first group
              </button>
              <span className="or-label">or take a look around</span>
              <button
                className="text-button muted"
                onClick={() =>
                  commit(sampleData(data), 'Sample groups added. You can remove them anytime.')
                }
              >
                <Sparkles size={14} /> Explore with sample groups
                <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          {!groupsOnly && (
            <div className="privacy-inline">
              <ShieldCheck size={15} />
              <span>Your memories are shared. Your data stays yours.</span>
              <Link to="/settings">
                How it works
                <ArrowUpRight size={13} />
              </Link>
            </div>
          )}
        </section>
        {!groupsOnly && (
          <aside className="activity-panel">
            <div className="section-heading">
              <h2>The latest</h2>
              <span className="live-dot" />
            </div>
            {recent.length ? (
              <div className="activity-list">
                {recent.map((e) => {
                  const group = data.groups.find((g) => g.id === e.groupId)!;
                  return (
                    <Link key={e.id} className="activity-item" to={`/groups/${group.id}`}>
                      {e.type === 'expense' ? (
                        <CategoryIcon category={e.category} />
                      ) : (
                        <span className="category-icon cat-settlement">
                          <CheckCheck size={20} />
                        </span>
                      )}
                      <div>
                        <strong>
                          {e.type === 'expense'
                            ? e.description
                            : `${data.members.find((m) => m.id === e.fromMemberId)?.name} paid ${data.members.find((m) => m.id === e.toMemberId)?.name}`}
                        </strong>
                        <small>{group.name}</small>
                        <span>{dateLabel(e.date)}</span>
                      </div>
                      <b>{formatMoney(e.amountMinor, group.currency)}</b>
                    </Link>
                  );
                })}
                <Link className="text-button muted" to="/activity">
                  All activity
                  <ChevronRight size={15} />
                </Link>
              </div>
            ) : (
              <div className="empty-activity">
                <span className="activity-line" />
                <CirclePlus size={26} strokeWidth={1} />
                <h3>A fresh little start.</h3>
                <p>
                  Your shared moments will
                  <br />
                  show up right here.
                </p>
              </div>
            )}
            <div className="little-note">
              <span className="eyebrow">
                <FolderHeart size={14} /> THE SPLITCRUMB WAY
              </span>
              <h3>
                Good friends.
                <br />
                Clear balances.
              </h3>
              <p>
                Because “I’ll get the next one”
                <br />
                should always feel good.
              </p>
              <span className="note-line" />
            </div>
          </aside>
        )}
      </div>
      <footer className="page-footer">
        <span>Every crumb counts.</span>
        <span>
          Made for the moments in between.<span className="tiny-logo">◔</span>
        </span>
      </footer>
    </>
  );
}
