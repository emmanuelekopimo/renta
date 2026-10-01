import Link from 'next/link';
import { Download, Plus, Receipt, Wallet } from 'lucide-react';
import { Empty, PageHeader, Person, Stat } from '@/components/ui';
import { getDb } from '@/db/client';
import { formatDate, formatPeriod, naira } from '@/lib/format';
import { periodOf } from '@/lib/rent';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { loadPortfolio } from '@/services/portfolio';
import { CalendarCheck, CreditCard } from 'lucide-react';

export const metadata = { title: 'Payments' };

const METHOD: Record<string, string> = { transfer: 'Bank transfer', cash: 'Cash', card: 'Card', pos: 'POS' };

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ tenantId?: string; period?: string }> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const today = getToday();
  const p = await loadPortfolio(getDb(), s.landlordId);
  const byId = new Map(p.tenants.map((t) => [t.id, t]));
  const list = p.payments.filter(
    (x) => (!sp.tenantId || String(x.tenantId) === sp.tenantId) && (!sp.period || x.period === sp.period),
  );
  const thisMonth = p.payments.filter((x) => periodOf(x.paidOn) === periodOf(today));
  const periods = [...new Set(p.payments.map((x) => x.period))].sort().reverse();

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Every rent payment you’ve recorded."
        actions={<Link className="btn" href="/payments/new" data-testid="add-payment"><Plus className="icon" />Record payment</Link>}
      />
      <section className="grid grid-3" style={{ marginBottom: 16 }}>
        <Stat tone="hero" Icon={Wallet} label="Received this month" value={naira(thisMonth.reduce((n, x) => n + x.amount, 0))} sub={`${thisMonth.length} payments`} />
        <Stat Icon={CalendarCheck} label="All time" value={naira(p.payments.reduce((n, x) => n + x.amount, 0))} sub={`${p.payments.length} payments`} />
        <Stat tone="amber" Icon={CreditCard} label="Most used method" value={(() => {
          const counts = new Map<string, number>();
          p.payments.forEach((x) => counts.set(x.method, (counts.get(x.method) ?? 0) + 1));
          const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
          return top ? METHOD[top[0]] : '—';
        })()} />
      </section>
      <form className="filters" action="/payments">
        <select name="tenantId" className="input" defaultValue={sp.tenantId ?? ''} style={{ maxWidth: 260 }} aria-label="Filter by tenant">
          <option value="">All tenants</option>
          {p.tenants.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
        </select>
        <select name="period" className="input" defaultValue={sp.period ?? ''} style={{ maxWidth: 200 }} aria-label="Filter by month">
          <option value="">All months</option>
          {periods.map((x) => <option key={x} value={x}>{formatPeriod(x)}</option>)}
        </select>
        <button className="btn btn-dark btn-sm" type="submit">Filter</button>
        {(sp.tenantId || sp.period) && <Link className="btn btn-ghost btn-sm" href="/payments">Clear</Link>}
        <a className="btn btn-ghost btn-sm" href="/api/payments.csv" style={{ marginLeft: 'auto' }}><Download className="icon" />Export CSV</a>
      </form>
      <div className="card">
        {list.length === 0 ? (
          <Empty Icon={Wallet} title="No payments found" />
        ) : (
          <div className="table-wrap">
            <table className="table" data-testid="payments-table">
              <thead><tr><th>Tenant</th><th>For month</th><th>Date paid</th><th>Method</th><th>Reference</th><th className="right">Amount</th><th></th></tr></thead>
              <tbody>
                {list.map((x) => {
                  const t = byId.get(x.tenantId)!;
                  return (
                    <tr key={x.id}>
                      <td><Person name={t.fullName} sub={t.property.name} /></td>
                      <td>{formatPeriod(x.period)}</td>
                      <td>{formatDate(x.paidOn)}</td>
                      <td><span className="chip">{METHOD[x.method]}</span></td>
                      <td className="muted small">{x.reference ?? '—'}</td>
                      <td className="right amount green">{naira(x.amount)}</td>
                      <td className="right"><Link className="icon-btn" href={`/payments/${x.id}/receipt`} title="Receipt"><Receipt className="icon" /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
