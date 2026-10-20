import type { IconName } from './icons';

/* The messages in the black bar above the header. */

export interface Announcement {
  id: string;
  /** Shown on wider screens. **Double asterisks** make words bold. */
  message: string;
  /** Shown on phones; falls back to `message`. */
  short: string;
  icon: IconName;
  linkLabel: string;
  linkHref: string;
}

export interface AnnouncementRow {
  id: string;
  message: string;
  short_message: string;
  icon: string;
  link_label: string;
  link_href: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/** Icons offered for the bar, with what they suit. */
export const ANNOUNCEMENT_ICONS: [IconName, string][] = [
  ['camera', 'Live Mirror'],
  ['truck', 'Delivery'],
  ['tag', 'Offer'],
  ['gift', 'Gift'],
  ['sparkle', 'New'],
  ['glasses', 'Frames'],
  ['eye', 'Lenses'],
  ['shield', 'Guarantee'],
  ['star', 'Bestseller'],
  ['clock', 'Hours'],
  ['phone', 'Call'],
  ['whatsapp', 'WhatsApp'],
  ['pin', 'Shop'],
  ['info', 'Notice'],
];

const ICON_SET = new Set<string>(ANNOUNCEMENT_ICONS.map(([i]) => i));
export const isAnnouncementIcon = (v: unknown): v is IconName => typeof v === 'string' && ICON_SET.has(v);

export const toAnnouncement = (r: AnnouncementRow): Announcement => ({
  id: r.id,
  message: r.message,
  short: r.short_message || r.message,
  icon: isAnnouncementIcon(r.icon) ? r.icon : 'info',
  linkLabel: r.link_label,
  linkHref: r.link_href,
});

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [{
  id: 'default',
  message: 'See any frame on your face, live. Press **Frame My Face** on a frame.',
  short: 'Try any frame on your face, live.',
  icon: 'camera',
  linkLabel: '',
  linkHref: '',
}];

/** Splits text on **bold** markers: odd pieces are bold. */
export const boldParts = (text: string) => text.split(/\*\*(.+?)\*\*/g);

/** Only site paths, https links, phone and WhatsApp links are allowed in the bar. */
export const isSafeHref = (href: string) =>
  /^\/(?!\/)[^\s]*$/.test(href) || /^https:\/\/[^\s]+$/i.test(href) || /^(tel|mailto):[^\s]+$/i.test(href);
