import Link from 'next/link';
import { Building2, MapPin, Plus, Users } from 'lucide-react';
import { Empty, PageHeader, propertyImage } from '@/components/ui';
import { getDb } from '@/db/client';
import { naira } from '@/lib/format';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { loadPortfolio, overdueList } from '@/services/portfolio';

export const metadata = { title: 'Properties' };

const TYPE_LABEL: Record<string, string> = { apartment: 'Apartments', house: 'House', duplex: 'Duplex', studio: 'Studios', shop: 'Commercial' };

export default async function PropertiesPage() {
  const s = await requireSession();
  const p = await loadPortfolio(getDb(), s.landlordId);
  const overdue = overdueList(p, getToday());

  return (
    <>
      <PageHeader
        title="Properties"
        subtitle={`${p.properties.length} properties · ${p.properties.reduce((n, x) => n + x.units, 0)} units`}
        actions={
          <Link className="btn" href="/properties/new" data-testid="add-property">
            <Plus className="icon" />
            Add property
          </Link>
        }
      />
      {p.properties.length === 0 ? (
        <div className="card">
          <Empty Icon={Building2} title="No properties yet">
            <Link className="btn" href="/properties/new">Add your first property</Link>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-3">
          {p.properties.map((prop) => {
            const active = p.tenants.filter((t) => t.propertyId === prop.id && t.status === 'active');
            const monthly = active.reduce((n, t) => n + t.rentAmount, 0);
            const late = overdue.filter((o) => o.tenant.propertyId === prop.id).length;
            const occ = Math.min(100, Math.round((active.length / prop.units) * 100));
            return (
              <Link key={prop.id} href={`/properties/${prop.id}`} className="card prop-card" data-testid="property-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="cover" src={propertyImage(prop.image)} alt="" />
                <div className="body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <h2>{prop.name}</h2>
                    {late > 0 && <span className="badge badge-overdue">{late} late</span>}
                  </div>
                  <span className="muted small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <MapPin className="icon" style={{ width: 14, height: 14 }} />
                    {prop.address}, {prop.city}
                  </span>
                  <div className="meta">
                    <span className="chip"><Building2 className="icon" />{TYPE_LABEL[prop.type]}</span>
                    <span className="chip"><Users className="icon" />{active.length}/{prop.units} occupied</span>
                  </div>
                  <div className="occ"><span style={{ width: `${occ}%` }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted small">Monthly rent</span>
                    <span className="amount">{naira(monthly)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
