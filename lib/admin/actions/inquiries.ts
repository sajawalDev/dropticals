'use server';

import { adminDb } from '@/lib/supabase/server';
import { asAdmin, dbMessage, fail, isUuid, refresh, type ActionResult } from '../guard';
import { isInquiryStatus } from '../types';

/* Messages from the contact page. */

export async function setInquiryStatus(id: string, status: string): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isUuid(id)) return fail('That message was not found.');
    if (!isInquiryStatus(status)) return fail('Choose a valid status.');
    const { error } = await adminDb().from('inquiries').update({ status }).eq('id', id);
    if (error) return fail(dbMessage(error, 'message'));
    refresh();
    return { ok: true };
  });
}

export async function deleteInquiry(id: string): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isUuid(id)) return fail('That message was not found.');
    const { error } = await adminDb().from('inquiries').delete().eq('id', id);
    if (error) return fail(dbMessage(error, 'message'));
    refresh();
    return { ok: true };
  });
}
