import { redirect } from 'next/navigation';
import { BellRing, CalendarClock, Wallet } from 'lucide-react';
import { LoginForm } from '@/components/forms';
import { getSession } from '@/lib/session';

export const metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await getSession()) redirect('/');
  return (
    <main className="auth">
      <section className="auth-art">
        <div className="brand" style={{ padding: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo.svg" alt="" />
          Renta
        </div>
        <div>
          <h1>Rent collection, minus the stress.</h1>
          <p>Track properties, tenants and due dates. Record payments in seconds and nudge late payers with one tap.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="art" src="/img/properties/home-1.svg" alt="" style={{ borderRadius: 24, boxShadow: '0 30px 60px rgba(0,0,0,.18)' }} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span className="chip"><CalendarClock className="icon" />Due dates</span>
          <span className="chip"><Wallet className="icon" />Payments</span>
          <span className="chip"><BellRing className="icon" />Reminders</span>
        </div>
      </section>
      <section className="auth-form">
        <div className="inner">
          <div>
            <h1>Welcome back 👋</h1>
            <p className="muted" style={{ marginTop: 6 }}>Sign in to manage your properties.</p>
          </div>
          <div className="demo-hint">
            <strong>Demo account</strong> — demo@renta.app / renta123 (already filled in)
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
