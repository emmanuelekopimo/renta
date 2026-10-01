import Link from 'next/link';
import { BellRing, CircleCheck, MessageCircle, Send } from 'lucide-react';
import { sendAllRemindersAction, sendReminderAction } from '@/app/actions';
import { Empty, PageHeader, Person } from '@/components/ui';
import { getDb } from '@/db/client';
import { formatDate, formatPeriod, lateLabel, naira } from '@/lib/format';
import { buildReminderMessage } from '@/lib/rent';
import { requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import { loadPortfolio, overdueList } from '@/services/portfolio';

export const metadata = { title: 'Reminders' };

export default async function RemindersPage() {
  const s = await requireSession();
  const today = getToday();
  const p = await loadPortfolio(getDb(), s.landlordId);
  const overdue = overdueList(p, today);
  const byId = new Map(p.tenants.map((t) => [t.id, t]));

  return (
    <>
      <PageHeader
        title="Overdue reminders"
        subtitle="Friendly nudges for tenants whose rent is past due."
        actions={
          overdue.length > 0 && (
            <form action={sendAllRemindersAction}>
              <button className="btn" type="submit" data-testid="remind-all"><Send className="icon" />Remind all ({overdue.length})</button>
            </form>
          )
        }
      />
      <section className="grid grid-main">
        <div className="stack">
          {overdue.length === 0 && (
            <div className="card"><Empty Icon={CircleCheck} title="No overdue rent 🎉">Every tenant is up to date.</Empty></div>
          )}
          {overdue.map((o) => (
            <div className="card" key={o.tenant.id} data-testid="overdue-item">
              <div className="card-head">
                <Link href={`/tenants/${o.tenant.id}`}><Person name={o.tenant.fullName} sub={`${o.tenant.property.name} · ${o.tenant.unitLabel} · ${o.tenant.phone}`} /></Link>
                <div className="right">
                  <div className="amount red" style={{ fontSize: 20 }}>{naira(o.amount)}</div>
                  <span className="badge badge-overdue">{lateLabel(o.oldest.daysLate)}{o.months > 1 ? ` · ${o.months} months` : ''}</span>
                </div>
              </div>
              <div className="message-box">
                {buildReminderMessage({
                  tenantName: o.tenant.fullName,
                  propertyName: o.tenant.property.name,
                  unitLabel: o.tenant.unitLabel,
                  amount: o.amount,
                  period: o.oldest.period,
                  daysLate: o.oldest.daysLate,
                  landlordName: s.name,
                  formatMoney: naira,
                  formatPeriod,
                })}
              </div>
              <form action={sendReminderAction} style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="hidden" name="tenantId" value={o.tenant.id} />
                <input type="hidden" name="back" value="/reminders" />
                <select name="channel" className="input" defaultValue="whatsapp" style={{ maxWidth: 160 }} aria-label="Channel">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
                <button className="btn btn-dark" type="submit"><BellRing className="icon" />Send reminder</button>
                <span className="muted small" style={{ marginLeft: 'auto' }}>
                  {o.lastReminder ? `Last reminded ${formatDate(o.lastReminder.sentAt.toISOString())}` : 'Not reminded yet'}
                </span>
              </form>
            </div>
          ))}
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-head"><h2>Sent history</h2></div>
          {p.reminders.length === 0 ? (
            <Empty Icon={MessageCircle} title="No reminders sent yet" />
          ) : (
            <div className="list" data-testid="reminder-history">
              {p.reminders.slice(0, 12).map((r) => (
                <div className="list-item" key={r.id}>
                  <Person name={byId.get(r.tenantId)!.fullName} sub={`${r.channel.toUpperCase()} · ${formatDate(r.sentAt.toISOString())}`} />
                  <div className="amount">{naira(r.amountDue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
