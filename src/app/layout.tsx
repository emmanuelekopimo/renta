import type { Metadata, Viewport } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Renta — Rent made simple', template: '%s · Renta' },
  description: 'Properties, tenants, rent due dates, payments and overdue reminders for landlords.',
};

export const viewport: Viewport = { themeColor: '#34D186' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
