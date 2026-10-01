import { getDb } from '@/db/client';
import { getSession } from '@/lib/session';
import { loadPortfolio } from '@/services/portfolio';

export const dynamic = 'force-dynamic';

const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export async function GET() {
  const s = await getSession();
  if (!s) return new Response('Unauthorized', { status: 401 });
  const p = await loadPortfolio(getDb(), s.landlordId);
  const byId = new Map(p.tenants.map((t) => [t.id, t]));
  const lines = [['Date paid', 'Tenant', 'Property', 'Unit', 'For month', 'Method', 'Reference', 'Amount (NGN)'].map(esc).join(',')];
  for (const x of p.payments) {
    const t = byId.get(x.tenantId)!;
    lines.push([x.paidOn, t.fullName, t.property.name, t.unitLabel, x.period, x.method, x.reference, x.amount].map(esc).join(','));
  }
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="renta-payments.csv"' },
  });
}
