import type { Metadata } from 'next';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { DataError, getAdminProduct, getAdminTryOns, getFilterRows } from '@/lib/admin/data';
import { isUuid } from '@/lib/admin/guard';
import { dateTime } from '@/lib/admin/types';
import { publicSupabase } from '@/lib/supabase/env';
import { Badge, PageHead } from '@/components/admin/fields';
import { ProductForm } from '@/components/admin/ProductForm';
import { SetupNotice } from '@/components/admin/SetupNotice';
import { Icon } from '@/components/ui/Icon';

export async function generateMetadata({ params }: PageProps<'/admin/products/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const row = isUuid(id) ? await getAdminProduct(id).catch(() => null) : null;
  return { title: row ? `Edit ${row.name}` : 'Product' };
}

export default async function EditProductPage({ params }: PageProps<'/admin/products/[id]'>) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let row, filters, tryons;
  try {
    [row, filters, tryons] = await Promise.all([getAdminProduct(id), getFilterRows(), getAdminTryOns(id)]);
  } catch (e) {
    if (e instanceof DataError) return <><PageHead title="Product" /><SetupNotice message={e.message} /></>;
    throw e;
  }
  if (!row) notFound();

  return (
    <>
      <PageHead
        back={<NextLink className="adm-back" href="/admin/products"><Icon name="arrowLeft" />All products</NextLink>}
        title={<span className="flex flex-wrap items-center gap-3">{row.name}{row.is_active ? <Badge tone="green" dot>Live</Badge> : <Badge dot>Hidden</Badge>}{!row.in_stock && <Badge tone="red">Sold out</Badge>}</span>}
        sub={row.updated_at ? `Last saved ${dateTime(row.updated_at)}.` : undefined}
      />
      {/* A fresh form whenever the saved product changes (after saving, or a change made in another tab). */}
      <ProductForm key={`${row.id}:${row.updated_at}`} row={row} filters={filters} supabase={publicSupabase()} nextSort={row.sort_order}
        tryons={tryons.rows} tryonReady={tryons.ready} />
    </>
  );
}
