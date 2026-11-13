'use server';

import { adminDb, REVIEW_BUCKET } from '@/lib/supabase/server';
import { asAdmin, dbMessage, fail, isUuid, refresh, type ActionResult } from '../guard';

/* Customer reviews: choosing where each one shows in the shop, and removing them. */

export async function updateReview(
  id: string,
  patch: { show_on_home?: boolean; product_ids?: string[]; is_read?: boolean },
): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isUuid(id)) return fail('That review was not found.');
    const update: Record<string, unknown> = { is_read: true };
    if (patch?.show_on_home !== undefined) update.show_on_home = !!patch.show_on_home;
    if (patch?.product_ids !== undefined) {
      if (!Array.isArray(patch.product_ids) || patch.product_ids.length > 100 || !patch.product_ids.every(isUuid)) {
        return fail('Choose the products again.');
      }
      update.product_ids = [...new Set(patch.product_ids)];
    }
    if (patch?.is_read === false) update.is_read = false;
    const { error } = await adminDb().from('reviews').update(update).eq('id', id);
    if (error) return fail(dbMessage(error, 'review'));
    refresh({ shop: true });
    return { ok: true };
  });
}

/** Marks every review as seen (clears the sidebar badge). */
export async function markAllReviewsRead(): Promise<ActionResult> {
  return asAdmin(async () => {
    const { error } = await adminDb().from('reviews').update({ is_read: true }).eq('is_read', false);
    if (error) return fail(dbMessage(error, 'review'));
    refresh();
    return { ok: true };
  });
}

export async function deleteReview(id: string): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isUuid(id)) return fail('That review was not found.');
    const db = adminDb();
    const { data } = await db.from('reviews').select('video_path').eq('id', id).maybeSingle();
    const { error } = await db.from('reviews').delete().eq('id', id);
    if (error) return fail(dbMessage(error, 'review'));
    if (data?.video_path) await db.storage.from(REVIEW_BUCKET).remove([data.video_path as string]);
    refresh({ shop: true });
    return { ok: true };
  });
}
