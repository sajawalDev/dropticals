/* Types and labels shared by the dashboard's server and client code. */

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type Tone = 'amber' | 'blue' | 'violet' | 'sky' | 'green' | 'red' | 'gray';

export const ORDER_STATUSES: { value: OrderStatus; label: string; tone: Tone; hint: string }[] = [
  { value: 'pending', label: 'Pending', tone: 'amber', hint: 'New, not yet confirmed with the customer' },
  { value: 'confirmed', label: 'Confirmed', tone: 'blue', hint: 'Details confirmed by phone or WhatsApp' },
  { value: 'processing', label: 'Processing', tone: 'violet', hint: 'Lenses being cut and fitted' },
  { value: 'shipped', label: 'Shipped', tone: 'sky', hint: 'On its way to the customer' },
  { value: 'delivered', label: 'Delivered', tone: 'green', hint: 'Received by the customer' },
  { value: 'cancelled', label: 'Cancelled', tone: 'red', hint: 'Will not be fulfilled' },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; tone: Tone }[] = [
  { value: 'unpaid', label: 'Unpaid', tone: 'gray' },
  { value: 'paid', label: 'Paid', tone: 'green' },
  { value: 'refunded', label: 'Refunded', tone: 'red' },
];

export const PAYMENT_METHODS: Record<string, string> = { cod: 'Cash on delivery', bank: 'Bank transfer' };

export const statusInfo = (s: string) => ORDER_STATUSES.find(o => o.value === s) ?? ORDER_STATUSES[0];
export const paymentInfo = (s: string) => PAYMENT_STATUSES.find(o => o.value === s) ?? PAYMENT_STATUSES[0];
export const isOrderStatus = (v: unknown): v is OrderStatus => ORDER_STATUSES.some(o => o.value === v);
export const isPaymentStatus = (v: unknown): v is PaymentStatus => PAYMENT_STATUSES.some(o => o.value === v);

export interface OrderRow {
  id: string;
  order_no: string;
  status: OrderStatus;
  payment_method: 'cod' | 'bank';
  payment_status: PaymentStatus;
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postcode: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  item_count: number;
  has_prescription: boolean;
  admin_note: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_slug: string;
  product_name: string;
  product_code: string;
  color_slug: string;
  color_name: string;
  vision: 'zero' | 'rx';
  lens: string;
  lens_label: string;
  frame_price: number;
  lens_price: number;
  unit_price: number;
  qty: number;
  image_url: string | null;
  rx_path: string | null;
  rx_file_name: string | null;
  rx_pd: string;
  rx_note: string;
}

export interface Stats {
  orders_total: number;
  orders_by_status: Partial<Record<OrderStatus, number>>;
  revenue_total: number;
  period: { days: number; orders: number; revenue: number; orders_prev: number; revenue_prev: number };
  daily: { day: string; orders: number; revenue: number }[];
  products: { total: number; active: number; hidden: number; out_of_stock: number; featured: number };
}

export type FilterKind = 'categories' | 'shapes' | 'materials' | 'colors';

export const FILTER_KINDS: { kind: FilterKind; label: string; one: string; hint: string }[] = [
  { kind: 'categories', label: 'Categories', one: 'category', hint: 'Group frames by type, such as eyeglasses or sunglasses. Shown in the shop when two or more have frames.' },
  { kind: 'shapes', label: 'Shapes', one: 'shape', hint: 'Frame shapes. Each one is drawn with a built-in outline, used for the drawings and the Live Mirror.' },
  { kind: 'materials', label: 'Materials', one: 'material', hint: 'What frames are made of. The drawing style sets rim thickness, bridge and nose pads.' },
  { kind: 'colors', label: 'Colours', one: 'colour', hint: 'Frame colours. The finish and colour decide how they are painted on drawings and in the Live Mirror.' },
];

export const timeAgo = (iso: string, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d > 300 ? 'numeric' : undefined });
};

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });
