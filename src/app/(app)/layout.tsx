import { Suspense } from 'react';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/app/actions';
import { MobileNav, SideNav } from '@/components/Nav';
import { Toast } from '@/components/Toast';
import { Avatar } from '@/components/ui';
import { getDb } from '@/db/client';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { loadPortfolio, overdueList } from '@/services/portfolio';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const overdue = overdueList(await loadPortfolio(getDb(), session.landlordId), getToday());
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo.svg" alt="" />
          Renta
        </div>
        <SideNav overdueCount={overdue.length} />
        <div className="sidebar-foot">
          <div className="promo">
            <strong>Tip</strong>
            Tap "Remind all" on the Reminders page to nudge every late payer at once.
          </div>
          <div className="me">
            <Avatar seed={session.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{session.name}</strong>
              <small>Landlord</small>
            </div>
            <form action={logoutAction}>
              <button className="icon-btn" title="Sign out" aria-label="Sign out" data-testid="logout">
                <LogOut className="icon" />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
      <MobileNav />
      <Suspense>
        <Toast />
      </Suspense>
    </div>
  );
}
