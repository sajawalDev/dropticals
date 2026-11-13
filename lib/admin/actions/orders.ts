'use server';

import { sendOrderStatusEmail, type StatusMailResult } from '@/lib/mail/orders';
import { adminDb, RX_BUCKET } from '@/lib/supabase/server';
import { asAdmin, dbMessage, fail, isUuid, refresh, str, type ActionResult } from '../guard';
import { isOrderStatus, isPaymentStatus } from '../types';

/* Updating and deleting orders. Marking an order Confirmed or Delivered emails the customer. */

export async function updateOrder(
  id: string,
  patch: { status?: string; payment_status?: string; admin_note?: string },
): Promise<ActionResult<{ mail?: StatusMailResult }>> {
  return asAdmin(async () => {
    if (!isUuid(id)) return fail('That order was not found.');
    const update: Record<string, string> = {};
    if (patch?.status !== undefined) {
      if (!isOrderStatus(patch.status)) return fail('Choose a valid status.');
      update.status = patch.status;
    }
    if (patch?.payment_status !== undefined) {
      if (!isPaymentStatus(patch.payment_status)) return fail('Choose a valid payment status.');
      update.payment_status = patch.payment_status;
    }
    if (patch?.admin_note !== undefined) update.admin_note = str(patch.admin_note, 2000);
    if (!Object.keys(update).length) return { ok: true };
    const { error } = await adminDb().from('orders').update(update).eq('id', id);
    if (error) return fail(dbMessage(error, 'order'));
    const mail = update.status ? await sendOrderStatusEmail(id, update.status).catch(() => 'failed' as const) : undefined;
    refresh();
    return { ok: true, mail };
  });
}

export async function deleteOrder(id: string): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isUuid(id)) return fail('That order was not found.');
    const db = adminDb();
    const { data: items } = await db.from('order_items').select('rx_path').eq('order_id', id);
    const { error } = await db.from('orders').delete().eq('id', id);
    if (error) return fail(dbMessage(error, 'order'));
    const files = (items ?? []).map(i => i.rx_path).filter((p): p is string => !!p);
    if (files.length) await db.storage.from(RX_BUCKET).remove(files);
    refresh();
    return { ok: true };
  });
}
