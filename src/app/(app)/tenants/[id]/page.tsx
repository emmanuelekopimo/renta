import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BellRing, Mail, MessageCircle, Pencil, Phone, Wallet } from 'lucide-react';
import { deleteTenantAction, sendReminderAction } from '@/app/actions';
import { DeleteButton } from '@/components/forms';
import { Avatar, PageHeader, StatusBadge } from '@/components/ui';
import { getDb } from '@/db/client';
import { formatDate, formatPeriod, naira, ordinal, shortPeriod } from '@/lib/format';
import { arrears, periodOf, tenantLedger } from '@/lib/rent';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { loadPortfolio } from '@/services/portfolio';

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const id = Number((await params).id);
  const today = getToday();
  const p = await loadPortfolio(getDb(), s.landlordId);
  const t = p.tenants.find((x) => x.id === id);
  if (!t) notFound();

  const pays = p.payments.filter((x) => x.tenantId === id);
  const ledger = tenantLedger(t, pays, today);
  const owed = arrears(ledger);
  const current = ledger.find((l) => l.period === periodOf(today));
  const sent = p.reminders.filter((r) => r.tenantId === id);
  const totalPaid = pays.reduce((n, x) => n + x.amount, 0);

  return (
    <>
      <Link className="back" href="/tenants"><ArrowLeft className="icon" />Tenants</Link>
      <PageHeader
        title={t.fullName}
        subtitle={`${t.property.name} · ${t.unitLabel}`}
        actions={
          <>
            <Link className="btn btn-ghost" href={`/tenants/${id}/edit`}><Pencil className="icon" />Edit</Link>
            <Link className="btn" href={`/payments/new?tenantId=${id}${current && current.balance ? `&period=${current.period}` : ''}`}>
              <Wallet className="icon" />Record payment
            </Link>
          </>
        }
      />
      <section className="grid grid-main">
        <div className="stack">
          <div className="card">
            <div className="card-head"><h2>Payment history by month</h2><span className="muted small">Lease started {formatDate(t.leaseStart)}</span></div>
            <div className="month-strip" data-testid="month-strip">
              {ledger.map((l) => (
                <div key={l.period} className={`m ${l.status}`} title={`${formatPeriod(l.period)}: ${l.status}`}>{shortPeriod(l.period)}</div>
              ))}
            </div>
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="table">
                <thead><tr><th>Month</th><th>Due date</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
                <tbody>
                  {[...ledger].reverse().map((l) => (
                    <tr key={l.period}>
                      <td><strong>{formatPeriod(l.period)}</strong></td>
                      <td>{formatDate(l.dueDate)}</td>
                      <td>{naira(l.paid)}</td>
                      <td className={`amount ${l.balance && l.status === 'overdue' ? 'red' : ''}`}>{naira(l.balance)}</td>
                      <td><StatusBadge status={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="stack">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
              <Avatar seed={t.fullName} size="lg" />
              <h2>{t.fullName}</h2>
              <span className={`badge ${t.status === 'active' ? 'badge-paid' : 'badge-neutral'}`}>{t.status === 'active' ? 'Active lease' : 'Moved out'}</span>
            </div>
            <dl className="kv" style={{ marginTop: 16, textAlign: 'left' }}>
              <dt>Monthly rent</dt><dd>{naira(t.rentAmount)}</dd>
              <dt>Due day</dt><dd>{ordinal(t.dueDay)} of the month</dd>
              <dt>Lease</dt><dd>{formatDate(t.leaseStart)} → {formatDate(t.leaseEnd)}</dd>
              <dt>Total paid</dt><dd>{naira(totalPaid)}</dd>
              <dt>Arrears</dt><dd style={{ color: owed ? 'var(--red)' : undefined }} data-testid="tenant-arrears">{naira(owed)}</dd>
            </dl>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <a className="btn btn-ghost btn-sm" href={`mailto:${t.email}`}><Mail className="icon" />Email</a>
              <a className="btn btn-ghost btn-sm" href={`tel:${t.phone.replace(/\s/g, '')}`}><Phone className="icon" />Call</a>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Reminders</h2></div>
            {owed > 0 ? (
              <form action={sendReminderAction} className="form" style={{ marginBottom: 12 }}>
                <input type="hidden" name="tenantId" value={id} />
                <input type="hidden" name="back" value={`/tenants/${id}`} />
                <select name="channel" className="input" defaultValue="whatsapp" aria-label="Channel">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
                <button className="btn btn-dark btn-block" type="submit" data-testid="send-reminder"><BellRing className="icon" />Send overdue reminder</button>
              </form>
            ) : (
              <p className="muted small" style={{ marginBottom: 12 }}>No overdue rent — nothing to remind.</p>
            )}
            <div className="list">
              {sent.length === 0 && <p className="muted small">No reminders sent yet.</p>}
              {sent.map((r) => (
                <div key={r.id} className="list-item" style={{ display: 'block' }}>
                  <div className="muted small" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                    <MessageCircle className="icon" style={{ width: 14 }} />
                    {r.channel.toUpperCase()} · {formatDate(r.sentAt.toISOString())} · {naira(r.amountDue)}
                  </div>
                  <div className="message-box">{r.message}</div>
                </div>
              ))}
            </div>
          </div>
          <DeleteButton action={deleteTenantAction} id={id} label="Remove tenant" confirmText={`Remove ${t.fullName} and their payment history?`} />
        </div>
      </section>
    </>
  );
}
