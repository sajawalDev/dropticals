import type { ShapeOption } from '@/lib/catalog';
import { CONFIG, telHref, whatsappHref } from '@/lib/config';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';
import { LogoFull } from '@/components/ui/Logo';

export function Footer({ shapes }: { shapes: ShapeOption[] }) {
  return (
    <footer className="foot on-dark">
      <div className="wrap">
        <div className="foot__top">
          <div className="foot__brand">
            <LogoFull className="foot__logo" />
            <p>Eyeglasses with zero power or your prescription, delivered to your door.</p>
            <div className="foot__social">
              <a href={CONFIG.social.instagram} aria-label="Instagram"><Icon name="instagram" /></a>
              <a href={CONFIG.social.facebook} aria-label="Facebook"><Icon name="facebook" /></a>
              <a href={CONFIG.social.tiktok} aria-label="TikTok"><Icon name="tiktok" /></a>
              <a href={whatsappHref} aria-label="WhatsApp"><Icon name="whatsapp" /></a>
            </div>
          </div>
          <div className="foot__cols">
            <div>
              <h4>Shop</h4>
              <ul>
                <li><Link href="/shop?gender=men">Men&apos;s eyeglasses</Link></li>
                <li><Link href="/shop?gender=women">Women&apos;s eyeglasses</Link></li>
                <li><Link href="/shop">All frames</Link></li>
                <li><Link href="/mirror">Live Mirror</Link></li>
              </ul>
            </div>
            {shapes.length > 0 && (
              <div>
                <h4>Shapes</h4>
                <ul>{shapes.map(s => <li key={s.slug}><Link href={`/shop?shape=${s.slug}`}>{s.label}</Link></li>)}</ul>
              </div>
            )}
            <div>
              <h4>Help</h4>
              <ul>
                <li><Link href="/lenses">Lens guide</Link></li>
                <li><Link href="/lenses">Reading your prescription</Link></li>
                <li><Link href="/contact">Questions</Link></li>
                <li><Link href="/return-policy">Returns and exchanges</Link></li>
                <li><Link href="/review">Write a review</Link></li>
                <li><Link href="/bag">Your bag</Link></li>
              </ul>
            </div>
            <div>
              <h4>Visit the shop</h4>
              <ul>
                <li><span>{CONFIG.address}</span></li>
                <li><span>{CONFIG.hours}</span></li>
                <li><a href={telHref}>{CONFIG.phone}</a></li>
                <li><a href={whatsappHref}>WhatsApp us</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="foot__bottom">
          <span>© {new Date().getFullYear()} {CONFIG.legalName}</span>
          <span>Your camera video in the Live Mirror stays on your device.</span>
        </div>
      </div>
    </footer>
  );
}
