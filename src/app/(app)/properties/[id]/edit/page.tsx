import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PropertyForm } from '@/components/forms';
import { PageHeader } from '@/components/ui';
import { getDb } from '@/db/client';
import { requireSession } from '@/lib/session';
import { findProperty } from '@/services/portfolio';

export const metadata = { title: 'Edit property' };

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const property = await findProperty(getDb(), s.landlordId, Number((await params).id));
  if (!property) notFound();
  return (
    <div style={{ maxWidth: 720 }}>
      <Link className="back" href={`/properties/${property.id}`}><ArrowLeft className="icon" />{property.name}</Link>
      <PageHeader title="Edit property" />
      <div className="card"><PropertyForm property={property} /></div>
    </div>
  );
}
