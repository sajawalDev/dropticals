import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admin/auth';
import { getPendingCount, getRealtimeTopic } from '@/lib/admin/data';
import { publicSupabase } from '@/lib/supabase/env';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const [pending, topic] = await Promise.all([getPendingCount(), getRealtimeTopic().catch(() => null)]);
  return (
    <AdminShell admin={{ name: admin.name, email: admin.email }} pending={pending} supabase={publicSupabase()} topic={topic}>
      {children}
    </AdminShell>
  );
}
