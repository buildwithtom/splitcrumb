import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { fixture } from './lib/fixtures';
import { saveData, loadData, STORAGE_KEY } from './lib/storage';
import { balances } from './lib/balances';
beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});
function mount(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
it('starts empty, creates a group and persists a new equal expense', async () => {
  const user = userEvent.setup();
  mount();
  expect(screen.getByText('Good times are better shared.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Create your first group' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.type(dialog.getByLabelText('Group name'), 'Weekend away');
  await user.type(dialog.getByLabelText('Member 2 name'), 'Sam');
  await user.click(dialog.getByRole('button', { name: 'Create group' }));
  expect(screen.getByRole('heading', { name: 'Weekend away' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add expense' }));
  const expense = within(screen.getByRole('dialog'));
  await user.type(expense.getByLabelText('What was it for?'), 'Dinner');
  await user.type(expense.getByLabelText('Amount (INR)'), '900');
  expect(expense.getByText('All accounted for · ₹900')).toBeInTheDocument();
  await user.click(expense.getByRole('button', { name: 'Add expense' }));
  expect(loadData().data.expenses).toHaveLength(1);
  const data = loadData().data;
  expect(Object.values(balances(data, data.groups[0].id)).sort()).toEqual([-45000, 45000]);
});
it('edits and deletes an expense with fresh balances and confirmation', async () => {
  saveData(fixture());
  const user = userEvent.setup();
  mount('/groups/g');
  await user.click(screen.getByRole('button', { name: 'Edit expense Dinner' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.clear(dialog.getByLabelText('Amount (INR)'));
  await user.type(dialog.getByLabelText('Amount (INR)'), '1200');
  await user.click(dialog.getByRole('button', { name: 'Save changes' }));
  expect(balances(loadData().data, 'g').a).toBe(80000);
  await user.click(screen.getByRole('button', { name: 'Delete expense Dinner' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect(loadData().data.expenses).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Delete expense Dinner' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, delete' }));
  expect(loadData().data.expenses).toHaveLength(0);
  expect(balances(loadData().data, 'g').a).toBe(0);
});
it('records a partial settlement, edits it, then deletes it', async () => {
  saveData(fixture());
  const user = userEvent.setup();
  mount('/groups/g');
  await user.click(screen.getByRole('button', { name: 'Settle up' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.selectOptions(dialog.getByLabelText('Who paid?'), 'b');
  await user.selectOptions(dialog.getByLabelText('Who received?'), 'a');
  await user.type(dialog.getByLabelText('Amount (INR)'), '200');
  await user.click(dialog.getByRole('button', { name: 'Record settlement' }));
  expect(balances(loadData().data, 'g').b).toBe(-10000);
  await user.click(screen.getByRole('tab', { name: 'Settlements' }));
  await user.click(screen.getByRole('button', { name: 'Edit settlement Sam to Alex' }));
  const edit = within(screen.getByRole('dialog'));
  await user.clear(edit.getByLabelText('Amount (INR)'));
  await user.type(edit.getByLabelText('Amount (INR)'), '300');
  await user.click(edit.getByRole('button', { name: 'Record settlement' }));
  expect(balances(loadData().data, 'g').b).toBe(0);
  await user.click(screen.getByRole('button', { name: 'Delete settlement Sam to Alex' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, delete' }));
  expect(balances(loadData().data, 'g').b).toBe(-30000);
});
it('protects referenced members and locks currency once transactions exist', async () => {
  saveData(fixture());
  const user = userEvent.setup();
  mount('/groups/g');
  await user.click(screen.getByRole('button', { name: 'Edit group' }));
  expect(within(screen.getByRole('dialog')).getByLabelText('Currency')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Close dialog' }));
  await user.click(screen.getByRole('button', { name: '3 friends' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: 'Remove Alex (a)' }));
  expect(dialog.getByRole('alert')).toHaveTextContent('transaction history');
  expect(loadData().data.members).toHaveLength(3);
});
it('restores persisted records after remount', () => {
  saveData(fixture());
  const first = mount('/groups/g');
  expect(screen.getByText('Dinner')).toBeInTheDocument();
  first.unmount();
  mount('/groups/g');
  expect(screen.getByText('Dinner')).toBeInTheDocument();
});
it('preserves corrupted storage and presents recovery instructions', async () => {
  localStorage.setItem(STORAGE_KEY, '{broken');
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole('link', { name: 'Recover data' }));
  expect(screen.getByRole('button', { name: 'Download raw data' })).toBeInTheDocument();
  expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken');
});
it('requires confirmation before clearing all data', async () => {
  saveData(fixture());
  const user = userEvent.setup();
  mount('/settings');
  await user.click(screen.getByRole('button', { name: 'Clear all data' }));
  expect(loadData().data.groups).toHaveLength(1);
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect(loadData().data.groups).toHaveLength(1);
});
it('supports exact and percentage splits and validates their totals', async () => {
  saveData(fixture());
  const user = userEvent.setup();
  mount('/groups/g');
  await user.click(screen.getByRole('button', { name: 'Edit expense Dinner' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: 'Exact amounts' }));
  for (const [id, name, value] of [
    ['a', 'Alex', '500'],
    ['b', 'Sam', '200'],
    ['c', 'Tom', '200'],
  ]) {
    const field = dialog.getByLabelText(`Amount for ${name} (${id})`);
    await user.clear(field);
    await user.type(field, value);
  }
  await user.click(dialog.getByRole('button', { name: 'Save changes' }));
  expect(loadData().data.expenses[0].participants.map((s) => s.amountMinor)).toEqual([
    50000, 20000, 20000,
  ]);
  await user.click(screen.getByRole('button', { name: 'Edit expense Dinner' }));
  const percent = within(screen.getByRole('dialog'));
  await user.click(percent.getByRole('button', { name: 'Percentages' }));
  for (const [id, name, value] of [
    ['a', 'Alex', '50'],
    ['b', 'Sam', '25'],
    ['c', 'Tom', '24'],
  ])
    await user.type(percent.getByLabelText(`Percentage for ${name} (${id})`), value);
  await user.click(percent.getByRole('button', { name: 'Save changes' }));
  expect(percent.getByRole('alert')).toHaveTextContent('100.00%');
  expect(loadData().data.expenses[0].splitMethod).toBe('exact');
  const last = percent.getByLabelText('Percentage for Tom (c)');
  await user.clear(last);
  await user.type(last, '25');
  await user.click(percent.getByRole('button', { name: 'Save changes' }));
  expect(loadData().data.expenses[0].participants.map((s) => s.amountMinor)).toEqual([
    45000, 22500, 22500,
  ]);
});
it('validates imports and waits for confirmation before replacing records', async () => {
  saveData(fixture());
  const user = userEvent.setup();
  mount('/settings');
  const next = { ...fixture(), groups: [{ ...fixture().groups[0], name: 'Imported group' }] };
  const file = new File([JSON.stringify(next)], 'backup.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => JSON.stringify(next) });
  await user.upload(screen.getByLabelText('Import backup file'), file);
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(loadData().data.groups[0].name).toBe('Friends');
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Replace data' }),
  );
  expect(loadData().data.groups[0].name).toBe('Imported group');
});
it('keeps currency immutable after deleting the last expense', async () => {
  saveData(fixture());
  const user = userEvent.setup();
  mount('/groups/g');
  await user.click(screen.getByRole('button', { name: 'Delete expense Dinner' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, delete' }));
  await user.click(screen.getByRole('button', { name: 'Edit group' }));
  expect(within(screen.getByRole('dialog')).getByLabelText('Currency')).toBeDisabled();
});

it('preserves the saved record and keeps the form open if storage rejects a write', async () => {
  saveData(fixture());
  const user = userEvent.setup();
  mount('/groups/g');
  await user.click(screen.getByRole('button', { name: 'Edit expense Dinner' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.clear(dialog.getByLabelText('Amount (INR)'));
  await user.type(dialog.getByLabelText('Amount (INR)'), '1200');
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Quota exceeded');
  });
  await user.click(dialog.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Your change has not been applied');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  write.mockRestore();
  expect(loadData().data.expenses[0].amountMinor).toBe(90000);
});

it('blocks a stale tab from overwriting newer records', async () => {
  saveData(fixture());
  const user = userEvent.setup();
  mount('/groups/g');
  const changed = fixture();
  changed.groups[0].name = 'Changed in another tab';
  saveData(changed);
  await user.click(screen.getByRole('button', { name: 'Delete expense Dinner' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, delete' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Another tab changed your data');
  expect(loadData().data.groups[0].name).toBe('Changed in another tab');
  expect(loadData().data.expenses).toHaveLength(1);
});
