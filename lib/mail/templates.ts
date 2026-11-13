import 'server-only';
import { money } from '@/lib/catalog';
import { CONFIG, SITE, whatsappHref } from '@/lib/config';

/* =========================================================
   The shop's emails. Every one shares the same frame: the
   logo in the middle of the header with Instagram and TikTok
   on the right, and a footer with the founder's signature
   and the copyright line. Built from tables with inline
   styles, so they look the same in Gmail, Outlook and on phones.
   ========================================================= */

export const SOCIAL = {
  instagram: 'https://www.instagram.com/dr_s_opticals?obrf=MWE4Z3gwMHMxeGVtdA==',
  tiktok: 'https://www.tiktok.com/@drs.opticals?_r=1&_t=ZS-9BNRuCSA6AX',
};

export const FOUNDER = { name: 'Bilawal Nadeem', title: "Founder, Dr's Opticals" };

/** Where links and images in emails point: the live domain, else the Vercel production domain. */
export function mailBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return SITE.url;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel.replace(/\/+$/, '')}` : SITE.url;
}

const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',Times,serif";
const SCRIPT = "'Brush Script MT','Segoe Script','Lucida Handwriting','Apple Chancery',cursive";
const INK = '#0b0b0b', INK2 = '#3d3d3d', INK3 = '#6e6e6e', LINE = '#ececea', SOFT = '#f6f6f4', BG = '#f1f1ee';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name.trim();

/* ---------- building blocks ---------- */

function badge(text: string, tone: 'ink' | 'green' | 'amber' | 'blue' = 'ink') {
  const tones = { ink: [INK, '#ffffff'], green: ['#e7f6ec', '#11632f'], amber: ['#fff4dc', '#7a4b00'], blue: ['#e8efff', '#1d3fb8'] } as const;
  const [bg, fg] = tones[tone];
  return `<span style="display:inline-block;padding:7px 14px;border-radius:999px;background:${bg};color:${fg};font:700 11px/1 ${SANS};letter-spacing:.12em;text-transform:uppercase;">${esc(text)}</span>`;
}

const h1 = (html: string) =>
  `<h1 style="margin:18px 0 14px;font:400 30px/1.18 ${SERIF};color:${INK};letter-spacing:-.01em;">${html}</h1>`;

const p = (html: string, extra = '') =>
  `<p style="margin:0 0 16px;font:400 15px/1.65 ${SANS};color:${INK2};${extra}">${html}</p>`;

const h2 = (text: string) =>
  `<h2 style="margin:30px 0 12px;font:700 12px/1 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${INK3};">${esc(text)}</h2>`;

function button(href: string, label: string, ghost = false) {
  const bg = ghost ? '#ffffff' : INK, fg = ghost ? INK : '#ffffff';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;"><tr>
    <td align="center" bgcolor="${bg}" style="border-radius:999px;border:1.5px solid ${INK};">
      <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:15px 30px;font:700 14px/1 ${SANS};color:${fg};text-decoration:none;border-radius:999px;letter-spacing:.02em;">${esc(label)}</a>
    </td></tr></table>`;
}

/** A soft panel with a bold title, used for the most important message in an email. */
function callout(title: string, body: string, accent = INK) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
    <tr><td style="background:${SOFT};border-left:4px solid ${accent};border-radius:12px;padding:18px 20px;">
      <p style="margin:0 0 6px;font:700 15px/1.4 ${SANS};color:${INK};">${title}</p>
      <p style="margin:0;font:400 14px/1.6 ${SANS};color:${INK2};">${body}</p>
    </td></tr></table>`;
}

/** The order's journey: done steps are filled in, the current one is outlined. */
function steps(list: { title: string; text: string; state: 'done' | 'now' | 'next' }[]) {
  const rows = list.map((s, i) => {
    const circle = s.state === 'done'
      ? `background:${INK};color:#ffffff;border:1.5px solid ${INK};`
      : s.state === 'now' ? `background:#ffffff;color:${INK};border:1.5px solid ${INK};` : `background:#ffffff;color:#a3a3a3;border:1.5px solid #d4d4d0;`;
    const mark = s.state === 'done' ? '&#10003;' : String(i + 1);
    const last = i === list.length - 1;
    return `<tr>
      <td width="40" valign="top" style="width:40px;padding:0 0 ${last ? 0 : 16}px;">
        <div style="width:28px;height:28px;border-radius:50%;${circle}font:700 12px/28px ${SANS};text-align:center;">${mark}</div>
      </td>
      <td valign="top" style="padding:3px 0 ${last ? 0 : 16}px;">
        <p style="margin:0;font:700 14px/1.4 ${SANS};color:${s.state === 'next' ? INK3 : INK};">${esc(s.title)}</p>
        <p style="margin:2px 0 0;font:400 13px/1.55 ${SANS};color:${INK3};">${s.text}</p>
      </td></tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 8px;">${rows}</table>`;
}

function keyValues(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LINE};border-radius:14px;border-collapse:separate;">
    ${rows.map(([k, v], i) => `<tr>
      <td valign="top" style="padding:12px 16px;${i ? `border-top:1px solid ${LINE};` : ''}font:600 13px/1.5 ${SANS};color:${INK3};width:34%;">${esc(k)}</td>
      <td valign="top" style="padding:12px 16px;${i ? `border-top:1px solid ${LINE};` : ''}font:400 14px/1.5 ${SANS};color:${INK};">${v}</td>
    </tr>`).join('')}
  </table>`;
}

/* ---------- orders ---------- */

export interface MailOrder {
  id: string;
  order_no: string;
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postcode: string;
  payment_method: 'cod' | 'bank';
  subtotal: number;
  delivery_fee: number;
  total: number;
  item_count: number;
  has_prescription: boolean;
  created_at?: string;
}

export interface MailItem {
  product_slug: string;
  product_name: string;
  color_name: string;
  vision: 'zero' | 'rx';
  lens_label: string;
  qty: number;
  unit_price: number;
  image_url: string | null;
}

const PAY_LABEL = { cod: 'Cash on delivery', bank: 'Bank transfer' } as const;
const addressOf = (o: MailOrder) => [o.address, o.city, o.postcode].filter(Boolean).join(', ');

function itemsTable(items: MailItem[], base: string) {
  const rows = items.map((it, i) => {
    const img = it.image_url || `${base}/mail/frame.png`;
    const meta = [it.color_name, `${it.lens_label} lenses`, it.vision === 'rx' ? 'with your prescription' : 'zero power'].filter(Boolean).join(' · ');
    return `<tr>
      <td width="76" valign="middle" style="width:76px;padding:14px 0;${i ? `border-top:1px solid ${LINE};` : ''}">
        <img src="${esc(img)}" width="64" height="64" alt="${esc(it.product_name)}" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:12px;background:${SOFT};border:1px solid ${LINE};">
      </td>
      <td valign="middle" style="padding:14px 12px 14px 0;${i ? `border-top:1px solid ${LINE};` : ''}">
        <p style="margin:0;font:400 18px/1.25 ${SERIF};color:${INK};">${esc(it.product_name)}${it.qty > 1 ? ` <span style="font:600 13px ${SANS};color:${INK3};">&times; ${it.qty}</span>` : ''}</p>
        <p style="margin:4px 0 0;font:400 12.5px/1.5 ${SANS};color:${INK3};">${esc(meta)}</p>
      </td>
      <td valign="middle" align="right" style="padding:14px 0;${i ? `border-top:1px solid ${LINE};` : ''}font:700 14px/1.4 ${SANS};color:${INK};white-space:nowrap;">${esc(money(it.unit_price * it.qty))}</td>
    </tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

function totals(o: MailOrder) {
  const row = (k: string, v: string, strong = false) => `<tr>
    <td style="padding:${strong ? '12px 0 0' : '4px 0'};font:${strong ? 700 : 400} ${strong ? 16 : 14}px/1.4 ${SANS};color:${strong ? INK : INK2};${strong ? `border-top:1.5px solid ${INK};` : ''}">${k}</td>
    <td align="right" style="padding:${strong ? '12px 0 0' : '4px 0'};font:${strong ? 700 : 400} ${strong ? 16 : 14}px/1.4 ${SANS};color:${INK};${strong ? `border-top:1.5px solid ${INK};` : ''}">${v}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;border-top:1px solid ${LINE};padding-top:10px;">
    ${row('Subtotal', esc(money(o.subtotal)))}
    ${row('Delivery', o.delivery_fee ? esc(money(o.delivery_fee)) : 'Free')}
    ${row('Total', esc(money(o.total)), true)}
  </table>`;
}

/** Delivery window, three to four days from a date, in Pakistan time. */
export function deliveryWindow(from = new Date()) {
  const day = (n: number) => new Date(from.getTime() + n * 86_400_000)
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Karachi' });
  return `${day(3)} to ${day(4)}`;
}

/* ---------- the frame every email shares ---------- */

interface Frame {
  subject: string;
  preheader: string;
  content: string;
  /** Why this email was sent, under the card. */
  reason: string;
}

function frame({ subject, preheader, content, reason }: Frame) {
  const base = mailBaseUrl();
  const year = new Date().getFullYear();
  const socialIcon = (href: string, img: string, alt: string, gap = '') =>
    `<a href="${esc(href)}" target="_blank" style="display:inline-block;${gap}text-decoration:none;"><img src="${base}/mail/${img}" width="32" height="32" alt="${alt}" style="display:block;width:32px;height:32px;border:0;border-radius:50%;"></a>`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<style>
  @media (max-width:620px){
    .card{width:100%!important;border-radius:0!important;border-left:0!important;border-right:0!important}
    .px{padding-left:22px!important;padding-right:22px!important}
    .head{padding-left:16px!important;padding-right:16px!important}
    .side{width:76px!important}
    .logo{width:112px!important}
    .outer{padding:0!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BG};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
<tr><td class="outer" align="center" style="padding:32px 12px;">
  <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e4e4e0;border-radius:22px;overflow:hidden;">
    <tr><td class="head" style="padding:22px 28px 20px;border-bottom:1px solid ${LINE};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="side" width="84" style="width:84px;">&nbsp;</td>
        <td align="center" valign="middle">
          <a href="${base}" target="_blank" style="text-decoration:none;"><img class="logo" src="${base}/mail/logo.png" width="136" alt="Dr's Opticals" style="display:block;width:136px;height:auto;border:0;margin:0 auto;"></a>
        </td>
        <td class="side" width="84" align="right" valign="middle" style="width:84px;white-space:nowrap;">
          ${socialIcon(SOCIAL.instagram, 'instagram.png', 'Instagram')}${socialIcon(SOCIAL.tiktok, 'tiktok.png', 'TikTok', 'margin-left:8px;')}
        </td>
      </tr></table>
    </td></tr>

    <tr><td class="px" style="padding:34px 40px 6px;font-family:${SANS};color:${INK};">
      ${content}
    </td></tr>

    <tr><td class="px" style="padding:26px 40px 34px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${LINE};padding-top:24px;">
        <p style="margin:0 0 2px;font:400 14px/1.5 ${SANS};color:${INK3};">With care,</p>
        <p style="margin:0;font:400 36px/1.15 ${SCRIPT};color:${INK};">${FOUNDER.name}</p>
        <p style="margin:6px 0 0;font:400 13px/1.5 ${SANS};color:${INK2};"><b style="color:${INK};">${FOUNDER.name}</b> &middot; ${esc(FOUNDER.title)}</p>
      </td></tr></table>
    </td></tr>

    <tr><td style="background:${INK};padding:28px 28px 26px;text-align:center;">
      <p style="margin:0 0 12px;font:600 13px/1.5 ${SANS};color:#ffffff;letter-spacing:.02em;">
        <a href="${esc(SOCIAL.instagram)}" target="_blank" style="color:#ffffff;text-decoration:none;">Instagram</a>
        <span style="color:#555;">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
        <a href="${esc(SOCIAL.tiktok)}" target="_blank" style="color:#ffffff;text-decoration:none;">TikTok</a>
        <span style="color:#555;">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
        <a href="${whatsappHref}" target="_blank" style="color:#ffffff;text-decoration:none;">WhatsApp</a>
        <span style="color:#555;">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
        <a href="${base}/return-policy" target="_blank" style="color:#ffffff;text-decoration:none;">Return policy</a>
      </p>
      <p style="margin:0 0 12px;font:400 12px/1.6 ${SANS};color:#b5b5b5;">${esc(CONFIG.phone)} &middot; <a href="mailto:${esc(CONFIG.email)}" style="color:#b5b5b5;text-decoration:none;">${esc(CONFIG.email)}</a></p>
      <p style="margin:0;font:400 12px/1.6 ${SANS};color:#8c8c8c;">&copy; ${year} ${esc(CONFIG.legalName)}. All rights reserved.</p>
    </td></tr>
  </table>
  <p style="max-width:520px;margin:18px auto 0;font:400 11.5px/1.6 ${SANS};color:#9a9a96;text-align:center;">${esc(reason)}</p>
</td></tr>
</table>
</body></html>`;
}

/* ---------- the emails ---------- */

export interface Built { subject: string; html: string; text: string }

const footerText = () =>
  `\n\nWith care,\n${FOUNDER.name}\n${FOUNDER.title}\n\nInstagram: ${SOCIAL.instagram}\nTikTok: ${SOCIAL.tiktok}\nWhatsApp: ${whatsappHref}\n\n© ${new Date().getFullYear()} ${CONFIG.legalName}. All rights reserved.`;

const itemsText = (items: MailItem[]) =>
  items.map(i => `- ${i.product_name}${i.qty > 1 ? ` x ${i.qty}` : ''} (${[i.color_name, i.lens_label, i.vision === 'rx' ? 'prescription' : 'zero power'].filter(Boolean).join(', ')}): ${money(i.unit_price * i.qty)}`).join('\n');

/** To the customer, the moment an order is placed. */
export function orderPlacedEmail(o: MailOrder, items: MailItem[]): Built {
  const base = mailBaseUrl();
  const name = esc(firstName(o.customer_name));
  const subject = `Thank you for your order ${o.order_no} | Dr's Opticals`;
  const content = `
    ${badge('Order received', 'amber')}
    ${h1(`Thank you for your order, ${name}!`)}
    ${p(`We have received your order <b style="color:${INK};">${esc(o.order_no)}</b> and our team is already on it. Thank you for trusting Dr&#39;s Opticals with your eyes.`)}
    ${callout(
      '&#128222;&nbsp; Expect an order confirmation call within 24 hours',
      `A member of our team will call you on <b style="color:${INK};">${esc(o.phone)}</b> to confirm your order${o.has_prescription ? ', your prescription' : ''} and your delivery address. Please keep your phone nearby. Your order is prepared as soon as it is confirmed.`,
    )}
    ${h2('What happens next')}
    ${steps([
      { title: 'Order received', text: 'Your order is safely with us.', state: 'done' },
      { title: 'Confirmation call', text: 'Within 24 hours, on the number you gave us.', state: 'now' },
      { title: o.has_prescription ? 'Prescription checked, lenses fitted' : 'Lenses fitted and checked', text: 'Each lens is shaped to your frame and inspected.', state: 'next' },
      { title: 'Delivered in 3 to 4 days', text: o.payment_method === 'cod' ? `Pay ${esc(money(o.total))} in cash when it arrives.` : 'We send our bank details on WhatsApp after the call.', state: 'next' },
    ])}
    ${h2('Your order')}
    ${itemsTable(items, base)}
    ${totals(o)}
    ${h2('Delivery details')}
    ${keyValues([
      ['Name', esc(o.customer_name)],
      ['Phone', esc(o.phone)],
      ['Address', esc(addressOf(o))],
      ['Payment', PAY_LABEL[o.payment_method]],
    ])}
    <div style="height:22px;"></div>
    ${p(`Need to change something? Reply to this email or message us on WhatsApp before your confirmation call.`)}
    ${button(whatsappHref, 'Message us on WhatsApp')}
    ${p(`<span style="font-size:13px;color:${INK3};">By placing this order you agreed to our <a href="${base}/return-policy" style="color:#1d4ed8;text-decoration:underline;">Return, Exchange &amp; Replacement Policy</a>.</span>`, 'margin-top:18px;')}
  `;
  const text = `Thank you for your order, ${firstName(o.customer_name)}!

We have received your order ${o.order_no}.

EXPECT AN ORDER CONFIRMATION CALL WITHIN 24 HOURS
We will call you on ${o.phone} to confirm your order and delivery address. Once confirmed, your order is delivered in 3 to 4 days.

Your order:
${itemsText(items)}
Delivery: ${o.delivery_fee ? money(o.delivery_fee) : 'Free'}
Total: ${money(o.total)}
Payment: ${PAY_LABEL[o.payment_method]}

Delivery address: ${addressOf(o)}

Return, Exchange & Replacement Policy: ${base}/return-policy${footerText()}`;
  return {
    subject,
    text,
    html: frame({ subject, preheader: `Order ${o.order_no} received. We will call you within 24 hours to confirm it.`, content, reason: `You are receiving this email because you placed order ${o.order_no} at Dr's Opticals.` }),
  };
}

/** To the shop, the moment an order is placed. */
export function orderReceivedAdminEmail(o: MailOrder, items: MailItem[]): Built {
  const base = mailBaseUrl();
  const subject = `New order ${o.order_no}: ${money(o.total)} from ${o.customer_name}`;
  const tel = o.phone.replace(/[^\d+]/g, '');
  const content = `
    ${badge('New order', 'green')}
    ${h1(`Order ${esc(o.order_no)} received`)}
    ${p(`${esc(o.customer_name)} placed an order for <b style="color:${INK};">${esc(money(o.total))}</b>${o.has_prescription ? ', including <b style="color:' + INK + ';">prescription lenses</b>' : ''}. Call within 24 hours to confirm it, then mark it Confirmed in the dashboard to send the customer their confirmation email.`)}
    ${button(`${base}/admin/orders/${o.id}`, 'Open in dashboard')}
    ${h2('Customer')}
    ${keyValues([
      ['Name', esc(o.customer_name)],
      ['Phone', `<a href="tel:${esc(tel)}" style="color:${INK};">${esc(o.phone)}</a>`],
      ['Email', o.email ? `<a href="mailto:${esc(o.email)}" style="color:${INK};">${esc(o.email)}</a>` : 'Not given'],
      ['Address', esc(addressOf(o))],
      ['Payment', PAY_LABEL[o.payment_method]],
      ['Prescription', o.has_prescription ? 'Yes, open the order to view it' : 'No, zero power only'],
    ])}
    ${h2('Items')}
    ${itemsTable(items, base)}
    ${totals(o)}
  `;
  const text = `New order ${o.order_no}

${o.customer_name}, ${o.phone}, ${o.email || 'no email'}
${addressOf(o)}
Payment: ${PAY_LABEL[o.payment_method]}
Prescription: ${o.has_prescription ? 'yes' : 'no'}

${itemsText(items)}
Total: ${money(o.total)}

Open: ${base}/admin/orders/${o.id}`;
  return {
    subject,
    text,
    html: frame({ subject, preheader: `${o.customer_name}, ${money(o.total)}. Call within 24 hours to confirm.`, content, reason: 'Sent to the shop for every new order on the website.' }),
  };
}

/** To the customer, when the order is marked Confirmed after the call. */
export function orderConfirmedEmail(o: MailOrder, items: MailItem[]): Built {
  const base = mailBaseUrl();
  const name = esc(firstName(o.customer_name));
  const window = deliveryWindow();
  const subject = `Your order ${o.order_no} is confirmed | Dr's Opticals`;
  const content = `
    ${badge('Order confirmed', 'blue')}
    ${h1(`Great news, ${name}! Your order is confirmed.`)}
    ${p(`Thank you for confirming your order <b style="color:${INK};">${esc(o.order_no)}</b> with us. Your glasses are now being prepared${o.has_prescription ? ' to your prescription' : ''}, and you will receive your order within <b style="color:${INK};">3 to 4 days</b>.`)}
    ${callout(
      '&#128666;&nbsp; Estimated delivery: ' + esc(window),
      `Delivered to ${esc(addressOf(o))}. ${o.payment_method === 'cod' ? `Please keep <b style="color:${INK};">${esc(money(o.total))}</b> ready to pay in cash when it arrives.` : 'We will share our bank details on WhatsApp if we have not already.'}`,
    )}
    ${h2('Order progress')}
    ${steps([
      { title: 'Order received', text: 'Thank you for ordering.', state: 'done' },
      { title: 'Order confirmed', text: 'Confirmed on the phone with you.', state: 'done' },
      { title: 'Being prepared', text: o.has_prescription ? 'Lenses cut to your prescription, fitted and checked.' : 'Lenses fitted to your frame and checked.', state: 'now' },
      { title: 'Delivered to your door', text: `Expected ${esc(window)}.`, state: 'next' },
    ])}
    ${h2('Your order')}
    ${itemsTable(items, base)}
    ${totals(o)}
    <div style="height:22px;"></div>
    ${p('Questions about your delivery? We are a message away.')}
    ${button(whatsappHref, 'Message us on WhatsApp')}
  `;
  const text = `Great news, ${firstName(o.customer_name)}! Your order ${o.order_no} is confirmed.

You will receive your order within 3 to 4 days (estimated ${window}).
Delivered to: ${addressOf(o)}
${o.payment_method === 'cod' ? `Please keep ${money(o.total)} ready to pay in cash on delivery.` : ''}

Your order:
${itemsText(items)}
Total: ${money(o.total)}${footerText()}`;
  return {
    subject,
    text,
    html: frame({ subject, preheader: `Your order is confirmed and will reach you within 3 to 4 days.`, content, reason: `You are receiving this email because you ordered from Dr's Opticals (order ${o.order_no}).` }),
  };
}

/** To the customer, when the order is marked Delivered: thanks and a review request. */
export function orderDeliveredEmail(o: MailOrder, items: MailItem[], reviewUrl: string): Built {
  const base = mailBaseUrl();
  const name = esc(firstName(o.customer_name));
  const subject = `Congratulations, your Dr's Opticals order has arrived!`;
  const stars = `<p style="margin:6px 0 4px;font:400 30px/1 ${SANS};color:#f5a700;letter-spacing:6px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>`;
  const content = `
    ${badge('Delivered', 'green')}
    ${h1(`Congratulations, ${name}! You have received your order.`)}
    ${p(`Your order <b style="color:${INK};">${esc(o.order_no)}</b> has been delivered. Thank you for your order and for choosing Dr&#39;s Opticals. We hope your new glasses make every day a little clearer.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 22px;">
      <tr><td align="center" style="background:${SOFT};border:1px solid ${LINE};border-radius:18px;padding:28px 22px;">
        <p style="margin:0;font:400 22px/1.3 ${SERIF};color:${INK};">How did we do?</p>
        ${stars}
        <p style="margin:10px auto 18px;max-width:400px;font:400 14px/1.6 ${SANS};color:${INK2};">Kindly give us a 5-star rating and a short review of our service. It takes less than a minute, and you can add a video too. Your words help other people choose their glasses with confidence.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
          <td align="center" bgcolor="${INK}" style="border-radius:999px;">
            <a href="${esc(reviewUrl)}" target="_blank" style="display:inline-block;padding:16px 34px;font:700 15px/1 ${SANS};color:#ffffff;text-decoration:none;border-radius:999px;">Give a review &rarr;</a>
          </td></tr></table>
      </td></tr>
    </table>
    ${h2('What you ordered')}
    ${itemsTable(items, base)}
    ${h2('Caring for your glasses')}
    ${p('Rinse the lenses with lukewarm water and dry them with the microfibre cloth. Fold the arms before you put them down, lenses facing up, and keep them in their case when you are not wearing them.')}
    ${callout(
      'Something not right?',
      `If anything arrived damaged, incorrect or with a manufacturing defect, please contact us within 48 hours of delivery and we will put it right. See our <a href="${base}/return-policy" style="color:#1d4ed8;text-decoration:underline;">Return, Exchange &amp; Replacement Policy</a>.`,
    )}
  `;
  const text = `Congratulations, ${firstName(o.customer_name)}! You have received your order ${o.order_no}.

Thank you for your order and for choosing Dr's Opticals.

Kindly give us a 5-star rating and a short review of our service:
${reviewUrl}

Something not right? Contact us within 48 hours of delivery. Policy: ${base}/return-policy${footerText()}`;
  return {
    subject,
    text,
    html: frame({ subject, preheader: 'Thank you for your order. Kindly give us a 5-star review, it takes a minute.', content, reason: `You are receiving this email because your Dr's Opticals order ${o.order_no} was delivered.` }),
  };
}

/* ---------- contact form ---------- */

export interface MailInquiry { id: string; name: string; email: string; phone: string; message: string }

const quote = (text: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;"><tr>
    <td style="background:${SOFT};border-radius:14px;padding:18px 20px;font:400 14px/1.65 ${SANS};color:${INK2};white-space:pre-wrap;">${esc(text)}</td>
  </tr></table>`;

/** To the person who used the contact form. */
export function inquiryThanksEmail(m: MailInquiry): Built {
  const name = esc(firstName(m.name));
  const subject = `Thank you for your message | Dr's Opticals`;
  const content = `
    ${badge('Message received')}
    ${h1(`Thank you for your message, ${name}.`)}
    ${p(`We have received your message and <b style="color:${INK};">${FOUNDER.name}</b>, our founder and a student of optometry, will personally get back to you soon.`)}
    ${h2('Your message')}
    ${quote(m.message)}
    ${p('Need an answer sooner? Message us on WhatsApp and we will reply as quickly as we can.')}
    ${button(whatsappHref, 'Message us on WhatsApp')}
  `;
  const text = `Thank you for your message, ${firstName(m.name)}.

We have received your message and ${FOUNDER.name}, our founder and a student of optometry, will personally get back to you soon.

Your message:
${m.message}${footerText()}`;
  return {
    subject,
    text,
    html: frame({ subject, preheader: `${FOUNDER.name} will get back to you soon.`, content, reason: "You are receiving this email because you sent us a message on the Dr's Opticals website." }),
  };
}

/** To the shop, for each contact-form message. Replying answers the customer directly. */
export function inquiryAdminEmail(m: MailInquiry): Built {
  const base = mailBaseUrl();
  const subject = `New message from ${m.name}`;
  const content = `
    ${badge('New message', 'blue')}
    ${h1(`${esc(m.name)} sent a message`)}
    ${p('Reply to this email to answer them directly.')}
    ${keyValues([
      ['Name', esc(m.name)],
      ['Email', `<a href="mailto:${esc(m.email)}" style="color:${INK};">${esc(m.email)}</a>`],
      ['Phone', m.phone ? esc(m.phone) : 'Not given'],
    ])}
    ${h2('Message')}
    ${quote(m.message)}
    ${button(`${base}/admin/inquiries`, 'Open inquiries')}
  `;
  const text = `New message from ${m.name} (${m.email}${m.phone ? ', ' + m.phone : ''}):

${m.message}

Open: ${base}/admin/inquiries`;
  return {
    subject,
    text,
    html: frame({ subject, preheader: m.message.slice(0, 120), content, reason: 'Sent to the shop for every message from the contact page.' }),
  };
}
