import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PaymentForm } from '@/components/forms';
import { PageHeader } from '@/components/ui';
import { getDb } from '@/db/client';
import { isValidPeriod, periodOf } from '@/lib/rent';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { loadPortfolio } from '@/services/portfolio';

export const metadata = { title: 'Record payment' };

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string; period?: string; amount?: string; back?: string }>;
}) {
  const s = await requireSession();
  const sp = await searchParams;
  const today = getToday();
  const p = await loadPortfolio(getDb(), s.landlordId);
  const tenants = p.tenants
    .filter((t) => t.status === 'active')
    .map((t) => ({ id: t.id, label: `${t.fullName} (${t.property.name}, ${t.unitLabel})`, rent: t.rentAmount }));
  return (
    <div style={{ maxWidth: 720 }}>
      <Link className="back" href="/payments"><ArrowLeft className="icon" />Payments</Link>
      <PageHeader title="Record a payment" subtitle="Log rent received by transfer, POS, cash or card." />
      <div className="card">
        <PaymentForm
          tenants={tenants}
          tenantId={sp.tenantId ? Number(sp.tenantId) : undefined}
          period={sp.period && isValidPeriod(sp.period) ? sp.period : periodOf(today)}
          amount={sp.amount ? Number(sp.amount) : undefined}
          today={today}
          back={sp.back}
        />
      </div>
    </div>
  );
}
