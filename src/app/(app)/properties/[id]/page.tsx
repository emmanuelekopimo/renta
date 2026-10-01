import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, MapPin, Pencil, Plus, Users, Wallet } from 'lucide-react';
import { deletePropertyAction } from '@/app/actions';
import { DeleteButton } from '@/components/forms';
import { Empty, PageHeader, Person, Stat, StatusBadge, propertyImage } from '@/components/ui';
import { getDb } from '@/db/client';
import { formatDate, naira, ordinal } from '@/lib/format';
import { periodOf } from '@/lib/rent';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { loadPortfolio, rentRoll } from '@/services/portfolio';

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const id = Number((await params).id);
  const today = getToday();
  const p = await loadPortfolio(getDb(), s.landlordId);
  const property = p.properties.find((x) => x.id === id);
  if (!property) notFound();

  const roll = new Map(rentRoll(p, periodOf(today), today).map((r) => [r.tenant.id, r]));
  const tenants = p.tenants.filter((t) => t.propertyId === id);
  const active = tenants.filter((t) => t.status === 'active');
  const monthly = active.reduce((n, t) => n + t.rentAmount, 0);

  return (
    <>
      <Link className="back" href="/properties"><ArrowLeft className="icon" />Properties</Link>
      <PageHeader
        title={property.name}
        subtitle={<span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><MapPin className="icon" style={{ width: 16 }} />{property.address}, {property.city}</span>}
        actions={
          <>
            <Link className="btn btn-ghost" href={`/properties/${id}/edit`}><Pencil className="icon" />Edit</Link>
            <Link className="btn" href={`/tenants/new?propertyId=${id}`}><Plus className="icon" />Add tenant</Link>
          </>
        }
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero-cover" src={propertyImage(property.image)} alt="" style={{ marginBottom: 16 }} />
      <section className="grid grid-3" style={{ marginBottom: 16 }}>
        <Stat Icon={Building2} label="Units" value={property.units} sub={`${property.type[0]!.toUpperCase()}${property.type.slice(1)}`} />
        <Stat tone="amber" Icon={Users} label="Occupied" value={`${active.length}/${property.units}`} sub={`${Math.round((active.length / property.units) * 100)}% occupancy`} />
        <Stat Icon={Wallet} label="Monthly rent roll" value={naira(monthly)} sub={`${naira(monthly * 12)} per year`} />
      </section>
      <div className="card">
        <div className="card-head"><h2>Tenants</h2></div>
        {tenants.length === 0 ? (
          <Empty Icon={Users} title="No tenants yet">
            <Link className="btn" href={`/tenants/new?propertyId=${id}`}>Add a tenant</Link>
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Tenant</th><th>Unit</th><th>Rent</th><th>Due</th><th>Lease ends</th><th>This month</th></tr></thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td><Link href={`/tenants/${t.id}`}><Person name={t.fullName} sub={t.phone} /></Link></td>
                    <td>{t.unitLabel}</td>
                    <td className="amount">{naira(t.rentAmount)}</td>
                    <td>{ordinal(t.dueDay)}</td>
                    <td>{formatDate(t.leaseEnd)}</td>
                    <td>{roll.get(t.id) ? <StatusBadge status={roll.get(t.id)!.status.status} /> : <span className="badge badge-neutral">Moved out</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop: 24 }}>
        <DeleteButton action={deletePropertyAction} id={id} label="Delete property" confirmText={`Delete ${property.name} and all its tenants and payments?`} />
      </div>
    </>
  );
}
