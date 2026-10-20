'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { useNavigate } from '@/components/shell/NavigationProvider';

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { href: string };

/** next/link that blinks the eyelids between pages. */
export function Link({ href, onNavigate, ...props }: LinkProps) {
  const navigate = useNavigate();
  return (
    <NextLink
      href={href}
      {...props}
      onNavigate={e => {
        onNavigate?.(e);
        e.preventDefault();
        navigate(href);
      }}
    />
  );
}
