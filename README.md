# Dr's Opticals

Website for Dr's Opticals Eye Care Center: an eyeglasses shop with a live camera try-on (the Live Mirror), a lens guide and eye-test booking.

Built with Next.js 16 (App Router), React 19 with the React Compiler, Tailwind CSS 4 and TypeScript.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm run build` creates the production build and `npm run lint` checks the code.

Set `NEXT_PUBLIC_SITE_URL` to the live domain (for example `https://drsopticals.com`) so canonical URLs, the sitemap, structured data and share images point at the right place.

## Where things live

| Path | What it holds |
| --- | --- |
| `lib/config.ts` | Store details: phone, WhatsApp, email, address, hours, currency, delivery fee, social links |
| `lib/catalog.ts` | Frames, shapes, finishes, materials, lens types and prices |
| `lib/frames.ts`, `lib/morph.ts` | The frame geometry engine that draws every pair of glasses and morphs between shapes |
| `lib/mirror/` | Live Mirror: MediaPipe face tracking, pose smoothing, canvas renderer and camera engine |
| `lib/seo.ts` | Page metadata helper and JSON-LD (Optician, WebSite, Product, BreadcrumbList, ItemList, FAQPage) |
| `app/` | Routes: home, shop, frame pages, Live Mirror, lenses, clinic, about, contact, bag, checkout, order; plus sitemap, robots, manifest and generated share images |
| `components/` | Shell (header, menu, search, drawer, eyelid transitions), home set pieces, shop, product configurator, forms |
| `styles/` | The design system, ported from the original design as Tailwind component layers |

## Notes

- The Live Mirror needs a secure page (https or localhost) to use the camera. Video is processed on the device and never uploaded.
- Orders, bookings and messages are handled in the browser only; connect them to a backend or email service before going live.
