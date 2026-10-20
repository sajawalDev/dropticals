import type { Metadata } from 'next';
import { LoginForm } from '@/components/admin/LoginForm';
import { LogoPartSvg } from '@/components/ui/Logo';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  const sp = await searchParams;
  const next = typeof sp.next === 'string' ? sp.next : '';
  const expired = sp.expired === '1';
  return (
    <div className="adm">
      <div className="adm-login">
        <div className="adm-login__art">
          <LogoPartSvg part="emblem" className="adm-login__mark" />
          <div>
            <h2>The shop, at a glance.</h2>
            <p>Orders arrive here the moment they are placed. Products, filters and the top bar update the shop as you save.</p>
          </div>
          <svg className="adm-login__chart" viewBox="0 0 300 300" aria-hidden="true">
            <g fill="#fff" fontFamily="var(--serif)" textAnchor="middle">
              <text x="150" y="110" fontSize="110">E</text>
              <text x="150" y="180" fontSize="54" letterSpacing="14">D O</text>
              <text x="150" y="230" fontSize="30" letterSpacing="10">S E E</text>
              <text x="150" y="266" fontSize="20" letterSpacing="8">C L E A R</text>
            </g>
          </svg>
        </div>
        <div className="adm-login__form">
          <LoginForm next={next} expired={expired} />
        </div>
      </div>
    </div>
  );
}
