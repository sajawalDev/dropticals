import { Fragment } from 'react';
import { Link } from './Link';

export type Crumb = { name: string; href?: string };

/** Breadcrumb trail; the last crumb is the current page. */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {trail.map((c, i) => (
        <Fragment key={c.name}>
          {i > 0 && <span aria-hidden="true">/</span>}
          {c.href ? <Link href={c.href}>{c.name}</Link> : <span>{c.name}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
