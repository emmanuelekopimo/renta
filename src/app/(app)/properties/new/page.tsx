import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PropertyForm } from '@/components/forms';
import { PageHeader } from '@/components/ui';
import { requireSession } from '@/lib/session';

export const metadata = { title: 'Add property' };

export default async function NewPropertyPage() {
  await requireSession();
  return (
    <div style={{ maxWidth: 720 }}>
      <Link className="back" href="/properties"><ArrowLeft className="icon" />Properties</Link>
      <PageHeader title="Add a property" subtitle="Give it a name, an address and how many units it has." />
      <div className="card"><PropertyForm /></div>
    </div>
  );
}
