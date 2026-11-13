import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admin/auth';
import { getInboxCounts, getRealtimeTopic } from '@/lib/admin/data';
import { publicSupabase } from '@/lib/supabase/env';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const [counts, topic] = await Promise.all([
    getInboxCounts().catch(() => ({ pending: 0, inquiries: 0, reviews: 0 })),
    getRealtimeTopic().catch(() => null),
  ]);
  return (
    <AdminShell admin={{ name: admin.name, email: admin.email }} counts={counts} supabase={publicSupabase()} topic={topic}>
      {children}
    </AdminShell>
  );
}
