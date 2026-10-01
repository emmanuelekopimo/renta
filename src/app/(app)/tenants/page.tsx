import Link from 'next/link';
import { Plus, Search, Users } from 'lucide-react';
import { Empty, PageHeader, Person, StatusBadge } from '@/components/ui';
import { getDb } from '@/db/client';
import { naira, ordinal } from '@/lib/format';
import { periodOf } from '@/lib/rent';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { loadPortfolio, overdueList, rentRoll } from '@/services/portfolio';

export const metadata = { title: 'Tenants' };

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  const s = await requireSession();
  const { q = '', show = 'active' } = await searchParams;
  const today = getToday();
  const p = await loadPortfolio(getDb(), s.landlordId);
  const roll = new Map(rentRoll(p, periodOf(today), today).map((r) => [r.tenant.id, r]));
  const arrears = new Map(overdueList(p, today).map((o) => [o.tenant.id, o.amount]));
  const needle = q.trim().toLowerCase();
  const list = p.tenants.filter(
    (t) =>
      (show === 'all' || t.status === show) &&
      (!needle || [t.fullName, t.email, t.unitLabel, t.property.name].some((v) => v.toLowerCase().includes(needle))),
  );

  return (
    <>
      <PageHeader
        title="Tenants"
        subtitle={`${p.tenants.filter((t) => t.status === 'active').length} active tenants across ${p.properties.length} properties`}
        actions={<Link className="btn" href="/tenants/new" data-testid="add-tenant"><Plus className="icon" />Add tenant</Link>}
      />
      <form className="filters" action="/tenants">
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
          <Search className="icon" style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)', width: 18 }} />
          <input className="input" name="q" defaultValue={q} placeholder="Search name, unit or property" style={{ paddingLeft: 38 }} />
        </div>
        <input type="hidden" name="show" value={show} />
        <div className="segmented">
          {[['active', 'Active'], ['moved_out', 'Moved out'], ['all', 'All']].map(([k, label]) => (
            <Link key={k} className={show === k ? 'on' : ''} href={`/tenants?show=${k}${q ? `&q=${encodeURIComponent(q)}` : ''}`}>{label}</Link>
          ))}
        </div>
      </form>
      <div className="card">
        {list.length === 0 ? (
          <Empty Icon={Users} title="No tenants found">Try a different search or add a tenant.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table" data-testid="tenants-table">
              <thead><tr><th>Tenant</th><th>Property</th><th>Rent</th><th>Due day</th><th>This month</th><th className="right">Arrears</th></tr></thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id}>
                    <td><Link href={`/tenants/${t.id}`}><Person name={t.fullName} sub={t.email} /></Link></td>
                    <td>{t.property.name}<div className="muted small">{t.unitLabel}</div></td>
                    <td className="amount">{naira(t.rentAmount)}</td>
                    <td>{ordinal(t.dueDay)}</td>
                    <td>{roll.get(t.id) ? <StatusBadge status={roll.get(t.id)!.status.status} /> : <span className="badge badge-neutral">Moved out</span>}</td>
                    <td className={`right amount ${arrears.get(t.id) ? 'red' : ''}`}>{arrears.get(t.id) ? naira(arrears.get(t.id)!) : '—'}</td>
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
