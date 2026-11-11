import { useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Database,
  Download,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { currencies, type Currency } from '../types';
import { useApp } from '../lib/state';
import { downloadFile, emptyData, importData } from '../lib/storage';
import { Field, Logo } from '../components/ui';
export function Settings() {
  const { data, commit, open, notify, recovery, storageError, replaceData } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  async function handleImport(file?: File) {
    if (!file) return;
    setImporting(true);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose a JSON file smaller than 20 MB.');
      const next = importData(await file.text());
      open({
        kind: 'confirm',
        title: 'Replace your current data?',
        description: `This file contains ${next.groups.length} groups, ${next.expenses.length} expenses, and ${next.settlements.length} settlements. Import replaces all current records. Export a backup first if you want to keep them.`,
        action: () => {
          replaceData(next);
        },
      });
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setImporting(false);
      if (input.current) input.current.value = '';
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE LITTLE DETAILS</div>
          <h1>Make yourself at home.</h1>
          <p>Your preferences, your data, your call.</p>
        </div>
      </div>
      <div className="settings-columns">
        <div>
          <section className="panel settings-panel">
            <div className="settings-heading">
              <span className="stat-icon">
                <Globe2 size={20} />
              </span>
              <div>
                <h2>Just your kind of currency</h2>
                <p>A starting point for new groups.</p>
              </div>
            </div>
            <Field
              label="Default currency"
              hint="Existing groups keep their own currency. We never combine currencies or convert money."
            >
              <select
                value={data.defaultCurrency}
                onChange={(e) =>
                  commit(
                    { ...data, defaultCurrency: e.target.value as Currency },
                    'Default currency saved.',
                  )
                }
                disabled={!!storageError}
              >
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </section>
          <section className="panel settings-panel">
            <div className="settings-heading">
              <span className="stat-icon">
                <Database size={20} />
              </span>
              <div>
                <h2>Your data, to go</h2>
                <p>A small backup goes a long way.</p>
              </div>
            </div>
            <div className="settings-row">
              <div>
                <h3>Export a backup</h3>
                <p>
                  {storageError
                    ? 'Use “Download raw data” below to preserve the original stored records.'
                    : 'Download your groups, expenses, and settlements as JSON.'}
                </p>
              </div>
              <button
                className="button secondary"
                disabled={!!storageError}
                onClick={() => {
                  downloadFile(
                    JSON.stringify(data, null, 2),
                    `splitcrumb-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  );
                  notify('Backup download started.');
                }}
              >
                <ArrowDownToLine size={16} /> Export
              </button>
            </div>
            <div className="settings-row">
              <div>
                <h3>Bring your data back</h3>
                <p>Restore a Splitcrumb JSON backup. You’ll confirm before anything is replaced.</p>
              </div>
              <button
                className="button secondary"
                disabled={importing}
                onClick={() => input.current?.click()}
              >
                <ArrowUpFromLine size={16} />
                {importing ? 'Reading…' : 'Import'}
              </button>
              <input
                ref={input}
                type="file"
                accept="application/json,.json"
                aria-label="Import backup file"
                className="sr-only"
                onChange={(e) => void handleImport(e.target.files?.[0])}
              />
            </div>
            {storageError && (
              <div className="recovery-card">
                <h3>Your stored data needs attention.</h3>
                <p>{storageError}</p>
                <p>
                  We haven’t overwritten it. Download the original below, or restore a valid backup.
                </p>
                {recovery !== undefined && (
                  <button
                    className="button secondary"
                    onClick={() => downloadFile(recovery, 'splitcrumb-raw-recovery.json')}
                  >
                    <Download size={16} /> Download raw data
                  </button>
                )}
              </div>
            )}
          </section>
          <section className="panel settings-panel danger-panel">
            <div className="settings-row">
              <div>
                <h3>A completely fresh start</h3>
                <p>Permanently remove all groups and transaction history from this browser.</p>
              </div>
              <button
                className="button danger"
                onClick={() =>
                  open({
                    kind: 'confirm',
                    title: 'Clear all Splitcrumb data?',
                    description:
                      'All groups, members, expenses, and settlements will be permanently removed from this browser. Download an export first if you want a backup.',
                    danger: true,
                    action: () => replaceData(emptyData()),
                  })
                }
              >
                <Trash2 size={16} /> Clear all data
              </button>
            </div>
          </section>
        </div>
        <aside>
          <section className="privacy-card">
            <span className="privacy-lock">
              <LockKeyhole size={30} strokeWidth={1.3} />
            </span>
            <span className="eyebrow">A LITTLE PEACE OF MIND</span>
            <h2>
              Shared expenses.
              <br />
              Private by nature.
            </h2>
            <p>Your data stays in this browser. Splitcrumb doesn’t sync between devices.</p>
            <ul>
              <li>
                <Check size={15} /> No account needed
              </li>
              <li>
                <Check size={15} /> No tracking or external services
              </li>
              <li>
                <Check size={15} /> Export your data anytime
              </li>
            </ul>
            <div>
              <ShieldCheck size={17} />
              <span>
                Clearing browser data removes your records. Keep a backup of the moments that count.
              </span>
            </div>
          </section>
          <section className="about">
            <Logo small />
            <p>Every crumb counts.</p>
            <span>Version 1.0 · A simpler way to share.</span>
          </section>
        </aside>
      </div>
    </>
  );
}
