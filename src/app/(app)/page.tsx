import Link from 'next/link';
import { AlertTriangle, BellRing, Building2, CalendarClock, CircleCheck, Plus, TrendingUp, Users, Wallet } from 'lucide-react';
import { sendReminderAction } from '@/app/actions';
import { BarChart } from '@/components/BarChart';
import { Empty, PageHeader, Person, Stat, StatusBadge } from '@/components/ui';
import { getDb } from '@/db/client';
import { formatDate, formatPeriod, lateLabel, naira } from '@/lib/format';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { dashboardStats, loadPortfolio } from '@/services/portfolio';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await requireSession();
  const today = getToday();
  const s = dashboardStats(await loadPortfolio(getDb(), session.landlordId), today);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader
        title={`${greet}, ${session.name.split(' ')[0]}`}
        subtitle={`Here is your rent for ${formatPeriod(s.period)} · Today is ${formatDate(today)}`}
        actions={
          <>
            <Link className="btn btn-ghost" href="/tenants/new">
              <Plus className="icon" />
              Add tenant
            </Link>
            <Link className="btn" href="/payments/new" data-testid="cta-record-payment">
              <Wallet className="icon" />
              Record payment
            </Link>
          </>
        }
      />

      <section className="grid grid-4" style={{ marginBottom: 16 }}>
        <Stat tone="hero" Icon={TrendingUp} label="Collected this month" value={naira(s.collected)} sub={`${s.collectionRate}% of ${naira(s.expected)} expected`} testId="stat-collected">
          <div className="progress">
            <span style={{ width: `${s.collectionRate}%` }} />
          </div>
        </Stat>
        <Stat tone="danger" Icon={AlertTriangle} label="Overdue rent" value={naira(s.overdueAmount)} sub={`${s.overdue.length} tenant${s.overdue.length === 1 ? '' : 's'} behind`} testId="stat-overdue" />
        <Stat Icon={Building2} label="Properties" value={s.propertyCount} sub={`${s.unitCount} units in total`} testId="stat-properties" />
        <Stat tone="amber" Icon={Users} label="Occupancy" value={`${s.occupancy}%`} sub={`${s.activeTenants} active tenants`} testId="stat-occupancy" />
      </section>

      <section className="grid grid-main">
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h2>Collections · last 6 months</h2>
              <Link href="/payments">All payments →</Link>
            </div>
            <BarChart data={s.chart} />
          </div>

          <div className="card" data-testid="overdue-card">
            <div className="card-head">
              <h2>Overdue tenants</h2>
              <Link href="/reminders">Reminders →</Link>
            </div>
            {s.overdue.length === 0 ? (
              <Empty Icon={CircleCheck} title="Everyone is up to date">No overdue rent right now.</Empty>
            ) : (
              <div className="list">
                {s.overdue.map((o) => (
                  <div className="list-item" key={o.tenant.id}>
                    <Link href={`/tenants/${o.tenant.id}`}>
                      <Person name={o.tenant.fullName} sub={`${o.tenant.property.name} · ${o.tenant.unitLabel}`} />
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div className="right">
                        <div className="amount red">{naira(o.amount)}</div>
                        <small className="muted">{lateLabel(o.oldest.daysLate)}</small>
                      </div>
                      <form action={sendReminderAction}>
                        <input type="hidden" name="tenantId" value={o.tenant.id} />
                        <input type="hidden" name="back" value="/" />
                        <button className="btn btn-dark btn-sm" type="submit">
                          <BellRing className="icon" />
                          Remind
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card" data-testid="upcoming-card">
            <div className="card-head">
              <h2>Due soon</h2>
              <Link href="/rent">Rent roll →</Link>
            </div>
            {s.upcoming.length === 0 ? (
              <Empty Icon={CalendarClock} title="Nothing due in the next 10 days" />
            ) : (
              <div className="list">
                {s.upcoming.map((r) => (
                  <div className="list-item" key={r.tenant.id}>
                    <Person name={r.tenant.fullName} sub={`${lateLabel(r.status.daysLate)} · ${formatDate(r.status.dueDate)}`} />
                    <div className="right">
                      <div className="amount">{naira(r.status.balance)}</div>
                      <StatusBadge status={r.status.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Recent payments</h2>
              <Link href="/payments">See all →</Link>
            </div>
            <div className="list">
              {s.recentPayments.map((p) => (
                <Link className="list-item" key={p.id} href={`/payments/${p.id}/receipt`}>
                  <Person name={p.tenant.fullName} sub={`${formatDate(p.paidOn)} · ${formatPeriod(p.period)}`} />
                  <div className="amount green">+{naira(p.amount)}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
