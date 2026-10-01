import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TenantForm } from '@/components/forms';
import { PageHeader } from '@/components/ui';
import { getDb } from '@/db/client';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { loadPortfolio } from '@/services/portfolio';

export const metadata = { title: 'Add tenant' };

export default async function NewTenantPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  const s = await requireSession();
  const { propertyId } = await searchParams;
  const p = await loadPortfolio(getDb(), s.landlordId);
  return (
    <div style={{ maxWidth: 760 }}>
      <Link className="back" href="/tenants"><ArrowLeft className="icon" />Tenants</Link>
      <PageHeader title="Add a tenant" subtitle="Rent and the due day drive the rent roll and overdue reminders." />
      <div className="card">
        <TenantForm properties={p.properties} today={getToday()} tenant={{ propertyId: propertyId ? Number(propertyId) : undefined }} />
      </div>
    </div>
  );
}
