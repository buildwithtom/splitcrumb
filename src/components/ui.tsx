import { cloneElement, useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react';
import {
  ArrowUpRight,
  Check,
  CircleHelp,
  Clapperboard,
  Coffee,
  House,
  Lightbulb,
  MoreHorizontal,
  Plane,
  ShoppingBag,
  X,
} from 'lucide-react';
import type { Category, Member } from '../types';
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? 'small' : ''}`}>
      <svg aria-hidden="true" viewBox="0 0 40 40">
        <path
          fill="currentColor"
          d="M18 2A18 18 0 0 0 2 20c0 9 7 17 16 18V2Zm4 0v16h16A18 18 0 0 0 22 2Zm0 20v16a18 18 0 0 0 16-16H22Z"
        />
      </svg>
      <span>
        splitcrumb<span className="lime">.</span>
      </span>
    </span>
  );
}
export function Avatar({ member, size = '' }: { member: Member; size?: string }) {
  return (
    <span
      className={`avatar ${size}`}
      title={member.name}
      style={{ backgroundColor: member.avatarColor }}
    >
      {member.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((v) => v[0])
        .join('')
        .toUpperCase()}
    </span>
  );
}
export function AvatarStack({ members }: { members: Member[] }) {
  return (
    <div className="avatar-stack">
      {members.slice(0, 4).map((m) => (
        <Avatar key={m.id} member={m} size="tiny" />
      ))}
      {members.length > 4 && <span className="avatar extra tiny">+{members.length - 4}</span>}
    </div>
  );
}
export function CategoryIcon({ category }: { category: Category }) {
  const Icon = {
    'Food & Drinks': Coffee,
    Travel: Plane,
    Shopping: ShoppingBag,
    Accommodation: House,
    Entertainment: Clapperboard,
    Utilities: Lightbulb,
    Other: MoreHorizontal,
  }[category];
  return (
    <span className={`category-icon cat-${category.split(' ')[0].toLowerCase()}`}>
      <Icon size={20} strokeWidth={1.7} />
    </span>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  close,
  returnFocus,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
  returnFocus?: HTMLElement | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = returnFocus ?? (document.activeElement as HTMLElement | null);
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [returnFocus]);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
    >
      <div className="modal-head">
        <div>
          <span className="eyebrow">A LITTLE LESS MATH</span>
          <h2 id="modal-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Close dialog" onClick={close}>
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function EmptyState({
  title,
  text,
  action,
  compact = false,
}: {
  title: string;
  text: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <span className="empty-symbol">
        <CircleHelp size={25} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Settled() {
  return (
    <div className="settled">
      <span>
        <Check size={22} />
      </span>
      <div>
        <h3>Not a crumb owed!</h3>
        <p>All square. On to the next good time.</p>
      </div>
    </div>
  );
}
export function TextArrow() {
  return <ArrowUpRight size={17} />;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const control = children as ReactElement<{ id?: string; 'aria-describedby'?: string }>;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(control, {
        id,
        'aria-describedby':
          [control.props['aria-describedby'], hint ? `${id}-hint` : undefined]
            .filter(Boolean)
            .join(' ') || undefined,
      })}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function FormError({ error }: { error: string }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}
