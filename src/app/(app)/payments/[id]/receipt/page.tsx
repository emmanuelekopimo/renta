import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { deletePaymentAction } from '@/app/actions';
import { DeleteButton } from '@/components/forms';
import { PrintButton } from '@/components/PrintButton';
import { getDb } from '@/db/client';
import { formatDate, formatPeriod, naira } from '@/lib/format';
import { requireSession } from '@/lib/session';
import { loadPortfolio } from '@/services/portfolio';

export const metadata = { title: 'Receipt' };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const id = Number((await params).id);
  const p = await loadPortfolio(getDb(), s.landlordId);
  const pay = p.payments.find((x) => x.id === id);
  if (!pay) notFound();
  const t = p.tenants.find((x) => x.id === pay.tenantId)!;
  const no = `RNT-${String(pay.id).padStart(6, '0')}`;

  return (
    <div className="receipt">
      <Link className="back no-print" href="/payments"><ArrowLeft className="icon" />Payments</Link>
      <div className="card" style={{ padding: 0 }} data-testid="receipt">
        <div className="head">
          <div className="brand" style={{ padding: 0, color: '#fff' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo.svg" alt="" />
            Renta
          </div>
          <span className="paid-stamp">PAID</span>
        </div>
        <div style={{ padding: 24 }}>
          <p className="muted small">Rent receipt · {no}</p>
          <div className="amount" style={{ fontSize: 40, margin: '6px 0 18px' }}>{naira(pay.amount)}</div>
          <dl className="kv">
            <dt>Received from</dt><dd>{t.fullName}</dd>
            <dt>Property</dt><dd>{t.property.name}</dd>
            <dt>Unit</dt><dd>{t.unitLabel}</dd>
            <dt>Rent for</dt><dd>{formatPeriod(pay.period)}</dd>
            <dt>Date paid</dt><dd>{formatDate(pay.paidOn)}</dd>
            <dt>Method</dt><dd style={{ textTransform: 'capitalize' }}>{pay.method}</dd>
            <dt>Reference</dt><dd>{pay.reference ?? '—'}</dd>
            <dt>Received by</dt><dd>{s.name}</dd>
          </dl>
        </div>
      </div>
      <div className="no-print" style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'space-between' }}>
        <PrintButton />
        <DeleteButton action={deletePaymentAction} id={pay.id} label="Delete payment" confirmText="Delete this payment record?" />
      </div>
    </div>
  );
}
