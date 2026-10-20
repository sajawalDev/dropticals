'use server';

import { isAnnouncementIcon, isSafeHref } from '@/lib/announcements';
import { adminDb } from '@/lib/supabase/server';
import { asAdmin, dbMessage, fail, isUuid, refresh, str, type ActionResult } from '../guard';

/* The messages in the black bar at the top of the shop. */

export interface AnnouncementInput {
  id?: string;
  message: string;
  short_message: string;
  icon: string;
  link_label: string;
  link_href: string;
  is_active: boolean;
}

export async function saveAnnouncement(input: AnnouncementInput): Promise<ActionResult<{ id: string }>> {
  return asAdmin(async () => {
    const message = str(input?.message, 200);
    if (!message) return fail('Write the message.', 'message');
    const short_message = str(input.short_message, 90);
    if (!isAnnouncementIcon(input.icon)) return fail('Choose an icon.', 'icon');
    const link_label = str(input.link_label, 40);
    const link_href = str(input.link_href, 300);
    if (link_href && !isSafeHref(link_href)) return fail('Links must start with /, https://, tel: or mailto:.', 'link_href');
    if (link_href && !link_label) return fail('Add the text for the link.', 'link_label');
    const row = { message, short_message, icon: input.icon, link_label: link_href ? link_label : '', link_href, is_active: !!input.is_active };

    const db = adminDb();
    if (isUuid(input.id)) {
      const { error } = await db.from('announcements').update(row).eq('id', input.id);
      if (error) return fail(dbMessage(error, 'message'));
      refresh({ shop: true });
      return { ok: true, id: input.id };
    }
    const { data: last } = await db.from('announcements').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await db.from('announcements').insert({ ...row, sort_order: (last?.sort_order ?? 0) + 1 }).select('id').single();
    if (error || !data) return fail(dbMessage(error ?? { message: 'Could not save.' }, 'message'));
    refresh({ shop: true });
    return { ok: true, id: data.id };
  });
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isUuid(id)) return fail('That message was not found.');
    const { error } = await adminDb().from('announcements').delete().eq('id', id);
    if (error) return fail(dbMessage(error, 'message'));
    refresh({ shop: true });
    return { ok: true };
  });
}

export async function setAnnouncementActive(id: string, active: boolean): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isUuid(id)) return fail('That message was not found.');
    const { error } = await adminDb().from('announcements').update({ is_active: !!active }).eq('id', id);
    if (error) return fail(dbMessage(error, 'message'));
    refresh({ shop: true });
    return { ok: true };
  });
}

export async function reorderAnnouncements(ids: string[]): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!Array.isArray(ids) || !ids.every(isUuid)) return fail('Could not reorder.');
    const db = adminDb();
    const results = await Promise.all(ids.slice(0, 50).map((id, i) => db.from('announcements').update({ sort_order: i + 1 }).eq('id', id)));
    const failed = results.find(r => r.error);
    if (failed?.error) return fail(dbMessage(failed.error));
    refresh({ shop: true });
    return { ok: true };
  });
}
