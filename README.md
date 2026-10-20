# Dr's Opticals

Website for Dr's Opticals: an eyeglasses shop with a live camera try-on (the Live Mirror), a lens guide, online ordering and an admin dashboard.

Built with Next.js 16 (App Router), React 19 with the React Compiler, Tailwind CSS 4, TypeScript and Supabase.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm run build` creates the production build and `npm run lint` checks the code.

### Environment

Set these on Vercel and in `.env.local` (never commit env files; `.env*` is git-ignored):

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | The Supabase project URL |
| `NEXT_SUPABASE_ANNON_KEY` | The anon (public) key. Used for storefront reads and live updates |
| `NEXT_SUPABASE_SERVICE_ROLE_KEY` | The service role key. Server only: orders, uploads and the dashboard |
| `ADMIN_JWT_SECRET` | Optional, 32+ characters. Signs admin sessions; derived from the service role key when unset |
| `NEXT_PUBLIC_SITE_URL` | The live domain, for canonical URLs, the sitemap and share images |

### Database

1. In Supabase, open **SQL Editor**, paste `supabase/schema.sql` and run it. It creates the tables, row level security, realtime, storage buckets and the starting catalogue. It is safe to run again.
2. Add the admin account with the `insert into public.admin_users …` statement (the password is stored as a bcrypt hash only).
3. Sign in at `/admin`.

## The dashboard (`/admin`)

- `proxy.ts` guards every `/admin` route: no valid session token, no entry. Pages and server actions check the session against the database again.
- Sessions are HS256 JWTs in an httpOnly cookie, 12 hours long. Passwords are bcrypt hashes; five wrong attempts lock sign-in for 15 minutes.
- **Orders**: arrive live (sound and notice), filter by status, search, change status and payment, private notes, open prescriptions.
- **Products**: add, edit, hide, mark sold out, feature, delete; photos upload straight to Supabase Storage.
- **Filters**: categories, shapes, materials and colours for the shop's filters.
- **Top bar**: the messages above the header, with icons and links.

Live updates come from database broadcasts (`broadcast_change()` in the schema): catalogue changes on the public `catalog` channel, order changes on a private channel whose random name only the server knows.

## Where things live

| Path | What it holds |
| --- | --- |
| `lib/config.ts` | Store details: phone, WhatsApp, email, address, hours, currency, delivery fee, social links |
| `lib/catalog.ts` | Drawing presets (shapes, materials, finishes), lenses and prices, the product model |
| `lib/catalog-build.ts`, `lib/catalog-server.ts` | Database rows to catalogue, and the cached storefront reads |
| `lib/catalog-seed.ts` | The built-in catalogue, used when the database cannot be reached |
| `lib/frames.ts`, `lib/morph.ts` | The frame geometry engine that draws every pair of glasses and morphs between shapes |
| `lib/mirror/` | Live Mirror: MediaPipe face tracking, pose smoothing, canvas renderer and camera engine |
| `lib/admin/` | Admin sessions, dashboard data and server actions |
| `lib/shop-actions.ts` | Placing orders and uploading prescriptions |
| `app/(site)/` | The shop: home, shop, frame pages, Live Mirror, lenses, about, contact, bag, checkout, order |
| `app/admin/` | The dashboard |
| `supabase/schema.sql` | Everything the database needs |

## Notes

- The Live Mirror needs a secure page (https or localhost) to use the camera. Video is processed on the device and never uploaded.
- Prescriptions are stored in a private bucket and opened from the dashboard with one-hour links.
- The logo's "Eye Care Center" tagline is hidden while there is no clinic (`LOGO_SHOP_BOX` in `lib/logo.ts`).
