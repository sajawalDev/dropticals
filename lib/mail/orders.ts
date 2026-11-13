import 'server-only';
import { reviewToken } from '@/lib/review-token';
import { adminDb } from '@/lib/supabase/server';
import { adminAddress, sendMail } from './mailer';
import {
  mailBaseUrl, orderConfirmedEmail, orderDeliveredEmail, orderPlacedEmail, orderReceivedAdminEmail,
  type MailItem, type MailOrder,
} from './templates';

/* Order emails: what goes out when an order is placed, confirmed and delivered. */

const ITEM_COLUMNS = 'product_slug, product_name, color_name, vision, lens_label, qty, unit_price, image_url';

async function loadOrder(id: string) {
  const db = adminDb();
  const [order, items] = await Promise.all([
    db.from('orders').select('*').eq('id', id).maybeSingle(),
    db.from('order_items').select(ITEM_COLUMNS).eq('order_id', id).order('created_at'),
  ]);
  if (order.error || !order.data) {
    console.error('[mail] order not found for email:', id, order.error?.message);
    return null;
  }
  return { order: order.data as MailOrder & Record<string, unknown>, items: (items.data ?? []) as MailItem[] };
}

/** "Thank you for your order" to the customer and "New order" to the shop, side by side. */
export async function sendOrderPlacedEmails(orderId: string) {
  const data = await loadOrder(orderId);
  if (!data) return { customer: false, admin: false };
  const { order, items } = data;
  const toCustomer = orderPlacedEmail(order, items);
  const toAdmin = orderReceivedAdminEmail(order, items);
  const [customer, admin] = await Promise.all([
    order.email ? sendMail({ to: order.email, ...toCustomer, replyTo: adminAddress() || undefined }) : Promise.resolve(false),
    sendMail({ to: adminAddress(), ...toAdmin, replyTo: order.email || undefined }),
  ]);
  return { customer, admin };
}

export type StatusMailResult = 'sent' | 'already-sent' | 'no-email' | 'failed' | 'none';

/**
 * After an order's status changes: "Order confirmed" or "Order delivered" (with the
 * review link) to the customer, once each. Other statuses send nothing.
 */
export async function sendOrderStatusEmail(orderId: string, status: string): Promise<StatusMailResult> {
  if (status !== 'confirmed' && status !== 'delivered') return 'none';
  const data = await loadOrder(orderId);
  if (!data) return 'failed';
  const { order, items } = data;
  const column = status === 'confirmed' ? 'confirmed_email_at' : 'delivered_email_at';
  if (order[column]) return 'already-sent';
  if (!order.email) return 'no-email';

  const built = status === 'confirmed'
    ? orderConfirmedEmail(order, items)
    : orderDeliveredEmail(order, items, `${mailBaseUrl()}/review${reviewToken(order.id) ? `?t=${encodeURIComponent(reviewToken(order.id))}` : ''}`);
  const ok = await sendMail({ to: order.email, ...built, replyTo: adminAddress() || undefined });
  if (!ok) return 'failed';
  // Remember it went out. Before supabase/schema.sql is run again the column is missing; that is fine.
  const { error } = await adminDb().from('orders').update({ [column]: new Date().toISOString() }).eq('id', orderId);
  if (error) console.warn('[mail] could not record the email time:', error.message);
  return 'sent';
}
