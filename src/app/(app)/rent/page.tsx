import Link from 'next/link';
import { BellRing, CalendarClock, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { sendReminderAction } from '@/app/actions';
import { Empty, PageHeader, Person, Stat, StatusBadge } from '@/components/ui';
import { getDb } from '@/db/client';
import { formatDate, formatPeriod, lateLabel, naira } from '@/lib/format';
import { addMonths, isValidPeriod, periodOf } from '@/lib/rent';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { loadPortfolio, rentRoll } from '@/services/portfolio';
import { AlertTriangle, CircleCheck } from 'lucide-react';

export const metadata = { title: 'Rent roll' };

export default async function RentPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const s = await requireSession();
  const today = getToday();
  const sp = await searchParams;
  const period = sp.period && isValidPeriod(sp.period) ? sp.period : periodOf(today);
  const rows = rentRoll(await loadPortfolio(getDb(), s.landlordId), period, today);
  const expected = rows.reduce((n, r) => n + r.status.rent, 0);
  const collected = rows.reduce((n, r) => n + Math.min(r.status.paid, r.status.rent), 0);
  const overdue = rows.filter((r) => r.status.status === 'overdue');

  return (
    <>
      <PageHeader
        title="Rent roll"
        subtitle="Every tenant’s rent and due date for the month."
        actions={
          <div className="segmented" style={{ alignItems: 'center' }}>
            <Link href={`/rent?period=${addMonths(period, -1)}`} aria-label="Previous month"><ChevronLeft className="icon" style={{ width: 16 }} /></Link>
            <strong style={{ padding: '0 10px' }} data-testid="rent-period">{formatPeriod(period)}</strong>
            <Link href={`/rent?period=${addMonths(period, 1)}`} aria-label="Next month"><ChevronRight className="icon" style={{ width: 16 }} /></Link>
          </div>
        }
      />
      <section className="grid grid-3" style={{ marginBottom: 16 }}>
        <Stat Icon={CalendarClock} label="Expected" value={naira(expected)} sub={`${rows.length} tenants`} />
        <Stat tone="hero" Icon={CircleCheck} label="Collected" value={naira(collected)} sub={`${expected ? Math.round((collected / expected) * 100) : 0}% collected`} />
        <Stat tone="danger" Icon={AlertTriangle} label="Overdue" value={naira(overdue.reduce((n, r) => n + r.status.balance, 0))} sub={`${overdue.length} tenants`} />
      </section>
      <div className="card">
        {rows.length === 0 ? (
          <Empty Icon={CalendarClock} title="No active leases this month" />
        ) : (
          <div className="table-wrap">
            <table className="table" data-testid="rent-table">
              <thead><tr><th>Tenant</th><th>Due date</th><th>Rent</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map(({ tenant: t, status: st, lastReminder }) => (
                  <tr key={t.id}>
                    <td><Link href={`/tenants/${t.id}`}><Person name={t.fullName} sub={`${t.property.name} · ${t.unitLabel}`} /></Link></td>
                    <td>{formatDate(st.dueDate)}<div className="muted small">{st.status === 'paid' ? 'Settled' : lateLabel(st.daysLate)}</div></td>
                    <td>{naira(st.rent)}</td>
                    <td>{naira(st.paid)}</td>
                    <td className={`amount ${st.status === 'overdue' ? 'red' : ''}`}>{naira(st.balance)}</td>
                    <td><StatusBadge status={st.status} />{lastReminder && <div className="muted small">Reminded {formatDate(lastReminder.sentAt.toISOString())}</div>}</td>
                    <td className="right">
                      {st.status !== 'paid' && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {st.status === 'overdue' && (
                            <form action={sendReminderAction}>
                              <input type="hidden" name="tenantId" value={t.id} />
                              <input type="hidden" name="back" value={`/rent?period=${period}`} />
                              <button className="btn btn-dark btn-sm" title="Send reminder"><BellRing className="icon" /></button>
                            </form>
                          )}
                          <Link className="btn btn-sm" href={`/payments/new?tenantId=${t.id}&period=${period}&amount=${st.balance}&back=${encodeURIComponent(`/rent?period=${period}`)}`}>
                            <Wallet className="icon" />Pay
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
