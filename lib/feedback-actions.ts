'use server';

import { isMissingTable } from './catalog-build';
import { adminAddress, sendMail } from './mail/mailer';
import { inquiryAdminEmail, inquiryThanksEmail } from './mail/templates';
import { readReviewToken } from './review-token';
import { adminDb, hasAdminDb, REVIEW_BUCKET } from './supabase/server';

/* =========================================================
   Storefront forms: the contact form and customer reviews.
   Both are saved for the dashboard with the service key.
   A hidden "website" field catches simple spam bots.
   ========================================================= */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const line = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const block = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '');

export interface InquiryInput {
  name: string;
  email: string;
  phone: string;
  message: string;
  website?: string;
}

/** Saves a contact-form message, thanks the sender by email and tells the shop. */
export async function sendInquiry(input: InquiryInput): Promise<Result<{ emailed: boolean }>> {
  const name = line(input?.name, 80);
  const email = line(input?.email, 120).toLowerCase();
  const phone = line(input?.phone, 24);
  const message = block(input?.message, 4000);
  if (name.length < 2) return { ok: false, error: 'Enter your name.' };
  if (!EMAIL.test(email)) return { ok: false, error: 'Enter a valid email address so we can reply.' };
  if (message.length < 2) return { ok: false, error: 'Write your message.' };
  if (line(input?.website, 200)) return { ok: true, emailed: true }; // a bot filled the hidden field

  let id = '';
  let saved = false;
  if (hasAdminDb()) {
    const { data, error } = await adminDb().from('inquiries').insert({ name, email, phone, message }).select('id').single();
    if (error) console.error('[inquiry] could not save:', error.message, isMissingTable(error) ? '(run supabase/schema.sql)' : '');
    else { id = data.id as string; saved = true; }
  }

  const m = { id, name, email, phone, message };
  const [emailed, notified] = await Promise.all([
    sendMail({ to: email, ...inquiryThanksEmail(m), replyTo: adminAddress() || undefined }),
    sendMail({ to: adminAddress(), ...inquiryAdminEmail(m), replyTo: email }),
  ]);
  if (!saved && !notified) {
    return { ok: false, error: 'We could not send your message just now. Please try again in a moment.' };
  }
  return { ok: true, emailed };
}

/* ---------- reviews ---------- */

const VIDEO_TYPES: Record<string, string> = {
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v', '3gp': 'video/3gpp',
};
const MAX_VIDEO_MB = 50; // the review-videos bucket's limit (supabase/schema.sql)
const VIDEO_PATH = /^reviews\/\d{4}-\d{2}\/[0-9a-f-]{36}\.(mp4|mov|webm|m4v|3gp)$/;

/** A one-time upload link for a review video. */
export async function prepareReviewVideo(file: { name: string; type: string; size: number }): Promise<Result<{ path: string; token: string; contentType: string }>> {
  if (!hasAdminDb()) return { ok: false, error: 'Video uploads are not available right now. You can still send your review without one.' };
  const ext = String(file?.name ?? '').split('.').pop()?.toLowerCase() ?? '';
  const byType = Object.entries(VIDEO_TYPES).find(([, t]) => t === file?.type)?.[0];
  const kind = VIDEO_TYPES[ext] ? ext : byType;
  if (!kind) return { ok: false, error: 'That video type is not supported. Use an MP4, MOV or WebM video.' };
  if (!(file.size > 0) || file.size > MAX_VIDEO_MB * 1024 * 1024) {
    return { ok: false, error: `That video is larger than ${MAX_VIDEO_MB} MB. Record a shorter clip and try again.` };
  }
  const path = `reviews/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${kind}`;
  const { data, error } = await adminDb().storage.from(REVIEW_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('[review] upload link failed:', error?.message);
    return { ok: false, error: 'We could not prepare the video upload. Please try again, or send your review without a video.' };
  }
  return { ok: true, path: data.path, token: data.token, contentType: VIDEO_TYPES[kind] };
}

export interface ReviewInput {
  firstName: string;
  email: string;
  rating: number;
  body: string;
  videoPath?: string;
  /** From the "Give a review" link in the order-delivered email. */
  token?: string;
  website?: string;
}

/** Saves a review for the dashboard. It shows in the shop only once an admin chooses where. */
export async function submitReview(input: ReviewInput): Promise<Result> {
  if (!hasAdminDb()) return { ok: false, error: 'Reviews cannot be saved right now. Please try again later.' };
  const first_name = line(input?.firstName, 60);
  const email = line(input?.email, 120).toLowerCase();
  const rating = Math.round(Number(input?.rating));
  const body = block(input?.body, 2000);
  const videoPath = line(input?.videoPath, 120);
  if (first_name.length < 1) return { ok: false, error: 'Enter your first name.' };
  if (!EMAIL.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: 'Choose a star rating.' };
  if (videoPath && !VIDEO_PATH.test(videoPath)) return { ok: false, error: 'Upload your video again.' };
  if (body.length < 3 && !videoPath) return { ok: false, error: 'Write a few words about your experience, or add a video.' };
  if (line(input?.website, 200)) return { ok: true };

  const db = adminDb();
  let order_no = '';
  const orderId = readReviewToken(input?.token);
  if (orderId) {
    const { data } = await db.from('orders').select('order_no').eq('id', orderId).maybeSingle();
    order_no = (data?.order_no as string | undefined) ?? '';
  }
  const video_url = videoPath ? db.storage.from(REVIEW_BUCKET).getPublicUrl(videoPath).data.publicUrl : null;
  const { error } = await db.from('reviews').insert({
    first_name, email, rating, body, order_no,
    video_path: videoPath || null,
    video_url,
  });
  if (error) {
    console.error('[review] could not save:', error.message);
    return { ok: false, error: isMissingTable(error) ? 'Reviews are not set up yet. Please try again later.' : 'We could not save your review. Please try again.' };
  }
  return { ok: true };
}
