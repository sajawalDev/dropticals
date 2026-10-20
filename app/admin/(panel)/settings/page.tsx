import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { getRealtimeTopic } from '@/lib/admin/data';
import { SESSION_HOURS } from '@/lib/admin/jwt';
import { adminDb, PRODUCT_BUCKET, RX_BUCKET } from '@/lib/supabase/server';
import { publicSupabase } from '@/lib/supabase/env';
import { Badge, PageHead } from '@/components/admin/fields';
import { PasswordForm } from '@/components/admin/PasswordForm';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Settings' };

async function checks() {
  const db = adminDb();
  const [tables, topic, buckets] = await Promise.all([
    db.from('products').select('id', { count: 'exact', head: true }),
    getRealtimeTopic().catch(() => null),
    db.storage.listBuckets(),
  ]);
  const names = new Set((buckets.data ?? []).map(b => b.id));
  return [
    { label: 'Database tables', ok: !tables.error, note: tables.error ? 'Run supabase/schema.sql in the SQL Editor.' : `${tables.count ?? 0} products stored` },
    { label: 'Live updates', ok: !!topic && !!publicSupabase(), note: topic ? 'Orders and changes are broadcast from the database.' : 'Run supabase/schema.sql to set up the live channel.' },
    { label: 'Photo storage', ok: names.has(PRODUCT_BUCKET), note: names.has(PRODUCT_BUCKET) ? 'Public bucket for product photos.' : 'The product-images bucket is missing.' },
    { label: 'Prescription storage', ok: names.has(RX_BUCKET), note: names.has(RX_BUCKET) ? 'Private bucket; opened with one-hour links.' : 'The prescriptions bucket is missing.' },
    {
      label: 'Session signing key', ok: true,
      note: process.env.ADMIN_JWT_SECRET && process.env.ADMIN_JWT_SECRET.length >= 32 ? 'Using ADMIN_JWT_SECRET.' : 'Derived from the service role key. Set ADMIN_JWT_SECRET to manage it separately.',
    },
  ];
}

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const list = await checks();

  return (
    <>
      <PageHead title="Settings" sub="Your account and how the dashboard is connected." />
      <div className="adm-grid adm-grid--main">
        <section className="adm-card">
          <div className="adm-card__head"><div><h2>Change password</h2><p>Changing it signs out every other device.</p></div></div>
          <div className="adm-card__body"><PasswordForm /></div>
        </section>
        <div className="adm-grid">
          <section className="adm-card">
            <div className="adm-card__head"><div><h2>Account</h2></div></div>
            <div className="adm-card__body">
              <dl className="adm-dl">
                <dt>Name</dt><dd>{admin.name}</dd>
                <dt>Email</dt><dd>{admin.email}</dd>
                <dt>Sessions</dt><dd>Signed in for {SESSION_HOURS} hours at a time</dd>
              </dl>
            </div>
          </section>
          <section className="adm-card">
            <div className="adm-card__head"><div><h2>System</h2><p>Everything should be green.</p></div></div>
            <div className="adm-list">
              {list.map(c => (
                <div className="adm-list__item" key={c.label} style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}>
                  <Badge tone={c.ok ? 'green' : 'red'}><Icon name={c.ok ? 'check' : 'info'} className="h-3.5 w-3.5" /></Badge>
                  <div className="adm-list__main"><b>{c.label}</b><span style={{ whiteSpace: 'normal' }}>{c.note}</span></div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
