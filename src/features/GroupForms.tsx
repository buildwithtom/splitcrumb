import { useState, type FormEvent } from 'react';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { currencies, type Group } from '../types';
import { avatarColors, uid, useApp } from '../lib/state';
import { Avatar, Field, FormError } from '../components/ui';
export function GroupForm({ group, close }: { group?: Group; close: () => void }) {
  const { data, commit } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState(group?.name ?? '');
  const [currency, setCurrency] = useState(group?.currency ?? data.defaultCurrency);
  const [names, setNames] = useState(['You', '']);
  const [error, setError] = useState('');
  const locked =
    !!group?.currencyLocked ||
    (!!group && [...data.expenses, ...data.settlements].some((r) => r.groupId === group.id));
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Give your group a name.');
    if (!group && names.filter((n) => n.trim()).length < 2)
      return setError('Add at least two members to start sharing.');
    const now = new Date().toISOString(),
      groupId = group?.id ?? uid();
    const members = names
      .filter((n) => n.trim())
      .map((name, i) => ({
        id: uid(),
        groupId,
        name: name.trim(),
        avatarColor: avatarColors[i % avatarColors.length],
        createdAt: now,
      }));
    const nextGroup: Group = {
      currencyLocked: group?.currencyLocked,
      id: groupId,
      name: name.trim(),
      currency,
      memberIds: group?.memberIds ?? members.map((m) => m.id),
      createdAt: group?.createdAt ?? now,
      updatedAt: now,
    };
    if (
      commit(
        {
          ...data,
          groups: group
            ? data.groups.map((g) => (g.id === group.id ? nextGroup : g))
            : [...data.groups, nextGroup],
          members: group ? data.members : [...data.members, ...members],
        },
        group ? 'Group updated.' : 'Your group is ready. Make some memories!',
      )
    ) {
      close();
      navigate(`/groups/${groupId}`);
    }
  }
  return (
    <form onSubmit={submit}>
      <Field label="Group name">
        <input
          autoFocus
          required
          maxLength={80}
          placeholder="e.g. The Goa getaway"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field
        label="Currency"
        hint={
          locked
            ? 'Currency is fixed because this group has transaction history.'
            : 'One group, one currency. No conversions, no surprises.'
        }
      >
        <select
          disabled={locked}
          value={currency}
          onChange={(e) => setCurrency(e.target.value as typeof currency)}
        >
          {currencies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      {!group && (
        <fieldset>
          <legend>Who’s in?</legend>
          <p className="muted small-text">
            Names can be the same. Every member gets a unique identity.
          </p>
          {names.map((n, i) => (
            <div className="member-input" key={i}>
              <span className="member-number">{String(i + 1).padStart(2, '0')}</span>
              <input
                aria-label={`Member ${i + 1} name`}
                maxLength={80}
                placeholder={i ? 'Friend’s name' : 'Your name'}
                value={n}
                onChange={(e) => setNames(names.map((v, j) => (j === i ? e.target.value : v)))}
              />
              {names.length > 2 && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove member field ${i + 1}`}
                  onClick={() => setNames(names.filter((_, j) => j !== i))}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button type="button" className="text-button" onClick={() => setNames([...names, ''])}>
            <UserPlus size={16} /> Add another friend
          </button>
        </fieldset>
      )}
      <FormError error={error} />
      <div className="form-footer">
        <button type="button" className="button secondary" onClick={close}>
          Cancel
        </button>
        <button className="button primary" type="submit">
          {group ? 'Save changes' : 'Create group'}
          <Plus size={17} />
        </button>
      </div>
    </form>
  );
}
export function MembersForm({ group, close }: { group: Group; close: () => void }) {
  const { data, commit, open } = useApp();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const members = data.members.filter((m) => m.groupId === group.id);
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.id, m.name])),
  );
  function save(e: FormEvent) {
    e.preventDefault();
    if (members.some((m) => !names[m.id]?.trim())) return setError('Every member needs a name.');
    const now = new Date().toISOString();
    const added = newName.trim()
      ? [
          {
            id: uid(),
            name: newName.trim(),
            groupId: group.id,
            avatarColor: avatarColors[members.length % avatarColors.length],
            createdAt: now,
          },
        ]
      : [];
    if (
      commit(
        {
          ...data,
          members: [
            ...data.members.map((m) =>
              m.groupId === group.id ? { ...m, name: names[m.id].trim() } : m,
            ),
            ...added,
          ],
          groups: data.groups.map((g) =>
            g.id === group.id
              ? { ...g, memberIds: [...g.memberIds, ...added.map((m) => m.id)], updatedAt: now }
              : g,
          ),
        },
        'Your people, all up to date.',
      )
    )
      close();
  }
  const remove = (id: string) => {
    const referenced =
      data.expenses.some(
        (e) => e.payerId === id || e.participants.some((p) => p.memberId === id),
      ) || data.settlements.some((s) => s.fromMemberId === id || s.toMemberId === id);
    if (referenced)
      return setError(
        'This member is part of the group’s transaction history and cannot be removed. You can rename them instead.',
      );
    open({
      kind: 'confirm',
      title: 'Remove this member?',
      description: 'This member has no transaction history. You can add them again later.',
      danger: true,
      action: () =>
        commit(
          {
            ...data,
            members: data.members.filter((m) => m.id !== id),
            groups: data.groups.map((g) =>
              g.id === group.id
                ? {
                    ...g,
                    memberIds: g.memberIds.filter((m) => m !== id),
                    updatedAt: new Date().toISOString(),
                  }
                : g,
            ),
          },
          'Member removed.',
        ),
    });
  };
  return (
    <form onSubmit={save}>
      <div className="member-edit-list">
        {members.map((m) => (
          <div className="member-input" key={m.id}>
            <Avatar member={m} size="tiny" />
            <input
              aria-label={`Name for ${m.name} (${m.id.slice(0, 4)})`}
              maxLength={80}
              required
              value={names[m.id]}
              onChange={(e) => setNames({ ...names, [m.id]: e.target.value })}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove ${m.name} (${m.id.slice(0, 4)})`}
              onClick={() => remove(m.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <Field label="Add someone new">
        <input
          value={newName}
          maxLength={80}
          placeholder="Their name"
          onChange={(e) => setNewName(e.target.value)}
        />
      </Field>
      <FormError error={error} />
      <div className="form-footer">
        <button type="button" className="button secondary" onClick={close}>
          Cancel
        </button>
        <button className="button primary" type="submit">
          Save members
        </button>
      </div>
    </form>
  );
}
