import type { Metadata } from 'next';
import NextLink from 'next/link';
import { DataError, getAdminProducts, getFilterRows } from '@/lib/admin/data';
import { plural } from '@/lib/catalog';
import { buildProduct, makeLookups, toCategory } from '@/lib/catalog-build';
import { PageHead } from '@/components/admin/fields';
import { ProductsTable } from '@/components/admin/ProductsTable';
import { SetupNotice } from '@/components/admin/SetupNotice';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Products' };

export default async function ProductsPage() {
  let rows, filters;
  try {
    [rows, filters] = await Promise.all([getAdminProducts(), getFilterRows()]);
  } catch (e) {
    if (e instanceof DataError) return <><PageHead title="Products" /><SetupNotice message={e.message} /></>;
    throw e;
  }
  const lookups = makeLookups(filters);
  const items = rows.map(r => ({ product: buildProduct(r, lookups), live: r.is_active }));
  const live = items.filter(i => i.live).length;

  return (
    <>
      <PageHead
        title="Products"
        sub={`${plural(items.length, 'product')}, ${live} live in the shop. Changes show in the shop as soon as you save.`}
        actions={<NextLink className="adm-btn" href="/admin/products/new"><Icon name="plus" />Add product</NextLink>}
      />
      <ProductsTable items={items} categories={filters.categories.map(toCategory)} />
    </>
  );
}
