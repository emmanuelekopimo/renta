import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { avatarUri } from '@/lib/avatar';
import type { RentStatus } from '@/lib/rent';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

export function Stat(props: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  Icon: LucideIcon;
  tone?: 'hero' | 'danger' | 'amber';
  children?: ReactNode;
  testId?: string;
}) {
  const { Icon } = props;
  return (
    <div className={`card stat ${props.tone ?? ''}`} data-testid={props.testId}>
      <div className="label">
        <span className="bubble">
          <Icon className="icon" />
        </span>
        {props.label}
      </div>
      <div className="value">{props.value}</div>
      {props.sub && <div className="sub">{props.sub}</div>}
      {props.children}
    </div>
  );
}

const STATUS_LABEL: Record<RentStatus, string> = { paid: 'Paid', partial: 'Part-paid', due: 'Upcoming', overdue: 'Overdue' };

export function StatusBadge({ status }: { status: RentStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Avatar({ seed, size = 'md' }: { seed: string; size?: 'md' | 'lg' }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`avatar ${size === 'lg' ? 'avatar-lg' : ''}`} src={avatarUri(seed)} alt="" />;
}

export function Person({ name, sub }: { name: string; sub?: ReactNode }) {
  return (
    <div className="person">
      <Avatar seed={name} />
      <div style={{ minWidth: 0 }}>
        <div className="name">{name}</div>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

export function Empty({ Icon, title, children }: { Icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="bubble">
        <Icon className="icon" />
      </span>
      <h3 style={{ color: 'var(--ink)' }}>{title}</h3>
      {children}
    </div>
  );
}

export function propertyImage(key: string) {
  return `/img/properties/${key}.svg`;
}
