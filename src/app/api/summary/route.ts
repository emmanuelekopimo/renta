import { getDb } from '@/db/client';
import { getSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { dashboardStats, loadPortfolio } from '@/services/portfolio';

export const dynamic = 'force-dynamic';

/** JSON snapshot of the dashboard numbers for the signed-in landlord. */
export async function GET() {
  const s = await getSession();
  if (!s) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const stats = dashboardStats(await loadPortfolio(getDb(), s.landlordId), getToday());
  return Response.json({
    period: stats.period,
    properties: stats.propertyCount,
    units: stats.unitCount,
    activeTenants: stats.activeTenants,
    occupancy: stats.occupancy,
    expected: stats.expected,
    collected: stats.collected,
    overdueAmount: stats.overdueAmount,
    overdueTenants: stats.overdue.map((o) => ({ id: o.tenant.id, name: o.tenant.fullName, amount: o.amount, daysLate: o.oldest.daysLate })),
  });
}
