import { useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  LayoutGrid,
  LockKeyhole,
  Plus,
  Scale,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { AppContext, type ModalState } from './lib/state';
import { loadData, saveData } from './lib/storage';
import type { AppData } from './types';
import { Logo, Modal } from './components/ui';
import { Dashboard } from './features/Dashboard';
import { GroupDetail } from './features/GroupDetail';
import { GroupForm, MembersForm } from './features/GroupForms';
import { ExpenseForm, SettlementForm } from './features/TransactionForms';
import { Settings as SettingsPage } from './features/Settings';
import { ActivityPage, BalancesPage } from './features/OverviewPages';
const nav = [
  { to: '/', text: 'Overview', icon: LayoutGrid },
  { to: '/groups', text: 'Your groups', icon: Users },
  { to: '/balances', text: 'Balances', icon: Scale },
  { to: '/activity', text: 'Activity', icon: Activity },
];
export default function App() {
  const [loaded] = useState(loadData);
  const [data, setData] = useState(loaded.data);
  const [storageError, setStorageError] = useState(loaded.error);
  const [recovery, setRecovery] = useState(loaded.raw);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [toastTimer, setToastTimer] = useState<ReturnType<typeof setTimeout>>();
  const location = useLocation();
  const [focusTarget, setFocusTarget] = useState<HTMLElement | null>(null);
  const storageSnapshot = useRef(loaded.raw ?? null);
  function openModal(next: ModalState) {
    if (!modal) setFocusTarget(document.activeElement as HTMLElement | null);
    setModal(next);
  }
  function notify(message: string, error = false) {
    if (toastTimer) clearTimeout(toastTimer);
    setToast({ message, error });
    setToastTimer(setTimeout(() => setToast(null), error ? 10000 : 5000));
  }
  function persist(next: AppData, message?: string) {
    try {
      if (localStorage.getItem('splitcrumb:data') !== storageSnapshot.current)
        throw new Error(
          'Another tab changed your data. Reload this page to get the latest records before making changes.',
        );
      saveData(next);
      storageSnapshot.current = JSON.stringify(next);
      setData(next);
      if (message) notify(message);
      return true;
    } catch (e) {
      notify((e as Error).message, true);
      return false;
    }
  }
  function commit(next: AppData, message?: string) {
    if (storageError) {
      notify(
        'Stored data needs recovery. Visit Settings to download the original or restore a backup.',
        true,
      );
      return false;
    }
    return persist(
      {
        ...next,
        groups: next.groups.map((g) => ({
          ...g,
          currencyLocked:
            g.currencyLocked ||
            [...data.expenses, ...data.settlements].some((r) => r.groupId === g.id),
        })),
      },
      message,
    );
  }
  function replaceData(next: AppData) {
    if (persist(next, 'Your browser data has been replaced.')) {
      setStorageError(undefined);
      setRecovery(undefined);
      return true;
    }
    return false;
  }
  const close = () => setModal(null);
  const currentTitle = location.pathname.startsWith('/groups/')
    ? 'Group details'
    : location.pathname === '/settings'
      ? 'Settings'
      : (nav.find((n) => n.to === location.pathname)?.text ?? 'Overview');
  const title =
    modal?.kind === 'group'
      ? modal.group
        ? 'Edit your group'
        : 'Good times start here.'
      : modal?.kind === 'members'
        ? 'Your kind of people.'
        : modal?.kind === 'expense'
          ? modal.expense
            ? 'A little adjustment.'
            : 'Add a shared moment.'
          : modal?.kind === 'settlement'
            ? modal.settlement
              ? 'Edit a settlement.'
              : 'A little more all square.'
            : modal?.kind === 'confirm'
              ? modal.title
              : 'Your settlement summary';
  return (
    <AppContext.Provider
      value={{ data, commit, open: openModal, notify, recovery, storageError, replaceData }}
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="app-shell">
        <aside className="sidebar">
          <Link to="/" className="brand-link" aria-label="Splitcrumb home">
            <Logo />
          </Link>
          <div className="sidebar-section-label">YOUR LITTLE CORNER</div>
          <nav aria-label="Main navigation">
            {nav.map(({ to, text, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={19} strokeWidth={1.7} />
                {text}
                {to === '/groups' && data.groups.length > 0 && (
                  <span className="nav-count">{data.groups.length}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <button className="sidebar-create" onClick={() => openModal({ kind: 'group' })}>
            <Plus size={17} /> Create a group
          </button>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <span className="little-flower">✳</span>
              <h3>
                Life’s better
                <br />
                when it’s shared.
              </h3>
              <p>Leave the little math to us.</p>
              <span>
                Every crumb counts.
                <ArrowUpRight size={15} />
              </span>
            </div>
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Settings size={19} strokeWidth={1.7} /> Settings
            </NavLink>
            <div className="local-label">
              <span /> LOCAL & LOVELY
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumbs">
              <span>My space</span>
              <ChevronRight size={13} />
              <strong>{currentTitle}</strong>
            </div>
            <Link to="/" className="mobile-brand" aria-label="Splitcrumb home">
              <Logo small />
            </Link>
            <div className="topbar-right">
              <span className="private-badge">
                <LockKeyhole size={12} /> Private by nature
              </span>
              <Link
                to="/settings"
                className="icon-button help-button"
                aria-label="About and data privacy"
              >
                <CircleHelp size={19} />
              </Link>
              <span className="you-avatar" title="Local browser workspace">
                Y
              </span>
            </div>
          </header>
          {storageError && (
            <div className="storage-banner" role="alert">
              <span>Your stored data needs attention. We’ve kept the original safe.</span>
              <Link to="/settings">
                Recover data
                <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          <main id="main" tabIndex={-1}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/groups" element={<Dashboard groupsOnly />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="/balances" element={<BalancesPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="*"
                element={
                  <div className="empty-state">
                    <h1>This crumb went missing.</h1>
                    <p>Let’s get you back to your groups.</p>
                    <Link className="button primary" to="/">
                      Back home
                    </Link>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {nav
            .filter((n) => n.to !== '/activity')
            .map(({ to, text, icon: Icon }) => (
              <NavLink
                to={to}
                key={to}
                end={to === '/'}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <Icon size={20} />
                <span>{text === 'Your groups' ? 'Groups' : text}</span>
              </NavLink>
            ))}
          <NavLink to="/settings">
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        </nav>
      </div>
      {modal && (
        <Modal
          key={`${modal.kind}-${modal.kind === 'confirm' ? modal.title : ''}`}
          title={title}
          subtitle={
            modal.kind === 'group'
              ? 'Bring your people together. We’ll take care of the rest.'
              : undefined
          }
          close={close}
          returnFocus={focusTarget}
        >
          {modal.kind === 'group' && <GroupForm group={modal.group} close={close} />}{' '}
          {modal.kind === 'members' && <MembersForm group={modal.group} close={close} />}{' '}
          {modal.kind === 'expense' && (
            <ExpenseForm group={modal.group} expense={modal.expense} close={close} />
          )}{' '}
          {modal.kind === 'settlement' && (
            <SettlementForm
              group={modal.group}
              settlement={modal.settlement}
              transfer={modal.transfer}
              close={close}
            />
          )}{' '}
          {modal.kind === 'confirm' && (
            <>
              <p className="confirmation-copy">{modal.description}</p>
              <div className="form-footer">
                <button className="button secondary" onClick={close}>
                  Cancel
                </button>
                <button
                  className={`button ${modal.danger ? 'danger' : 'primary'}`}
                  onClick={() => {
                    close();
                    modal.action();
                  }}
                >
                  {modal.danger ? 'Yes, delete' : 'Replace data'}
                </button>
              </div>
            </>
          )}{' '}
          {modal.kind === 'summary' && (
            <>
              <p className="muted small-text">
                Your browser couldn’t copy automatically. Select and copy the text below.
              </p>
              <textarea
                className="summary-text"
                aria-label="Settlement summary"
                readOnly
                value={modal.text}
                onFocus={(e) => e.target.select()}
              />
              <div className="form-footer">
                <button className="button primary" onClick={close}>
                  Done
                  <Check size={17} />
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? 'toast-error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          <span>{toast.error ? <CircleHelp size={19} /> : <Check size={19} />}</span>
          <p>{toast.message}</p>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
