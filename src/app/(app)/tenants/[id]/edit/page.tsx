import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TenantForm } from '@/components/forms';
import { PageHeader } from '@/components/ui';
import { getDb } from '@/db/client';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { findTenant, loadPortfolio } from '@/services/portfolio';

export const metadata = { title: 'Edit tenant' };

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const db = getDb();
  const tenant = await findTenant(db, s.landlordId, Number((await params).id));
  if (!tenant) notFound();
  const p = await loadPortfolio(db, s.landlordId);
  return (
    <div style={{ maxWidth: 760 }}>
      <Link className="back" href={`/tenants/${tenant.id}`}><ArrowLeft className="icon" />{tenant.fullName}</Link>
      <PageHeader title="Edit tenant" />
      <div className="card"><TenantForm tenant={tenant} properties={p.properties} today={getToday()} /></div>
    </div>
  );
}
