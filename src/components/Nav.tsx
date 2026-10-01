'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellRing, Building2, CalendarClock, LayoutDashboard, Users, Wallet } from 'lucide-react';

export const NAV = [
  { href: '/', label: 'Dashboard', short: 'Home', Icon: LayoutDashboard },
  { href: '/properties', label: 'Properties', short: 'Props', Icon: Building2 },
  { href: '/tenants', label: 'Tenants', short: 'Tenants', Icon: Users },
  { href: '/rent', label: 'Rent Roll', short: 'Rent', Icon: CalendarClock },
  { href: '/payments', label: 'Payments', short: 'Pay', Icon: Wallet },
  { href: '/reminders', label: 'Reminders', short: 'Remind', Icon: BellRing },
];

function isActive(path: string, href: string) {
  return href === '/' ? path === '/' : path.startsWith(href);
}

export function SideNav({ overdueCount }: { overdueCount: number }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {NAV.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={isActive(path, href) ? 'active' : ''} data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}>
          <Icon className="icon" />
          {label}
          {href === '/reminders' && overdueCount > 0 && <span className="count">{overdueCount}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="mobile-nav" aria-label="Mobile">
      {NAV.map(({ href, short, Icon }) => (
        <Link key={href} href={href} className={isActive(path, href) ? 'active' : ''}>
          <Icon className="icon" />
          {short}
        </Link>
      ))}
    </nav>
  );
}
