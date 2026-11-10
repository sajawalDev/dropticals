import type { Metadata } from 'next';
import NextLink from 'next/link';
import { DataError, getAdminProducts, getAdminTryOns, getFilterRows } from '@/lib/admin/data';
import { publicSupabase } from '@/lib/supabase/env';
import { PageHead } from '@/components/admin/fields';
import { ProductForm } from '@/components/admin/ProductForm';
import { SetupNotice } from '@/components/admin/SetupNotice';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Add product' };

export default async function NewProductPage() {
  let filters, products, tryons;
  try {
    [filters, products, tryons] = await Promise.all([getFilterRows(), getAdminProducts(), getAdminTryOns(null)]);
  } catch (e) {
    if (e instanceof DataError) return <><PageHead title="Add product" /><SetupNotice message={e.message} /></>;
    throw e;
  }
  const nextSort = products.reduce((n, p) => Math.max(n, p.sort_order), 0) + 1;
  return (
    <>
      <PageHead
        back={<NextLink className="adm-back" href="/admin/products"><Icon name="arrowLeft" />All products</NextLink>}
        title="Add product"
        sub="Fill in the details and add photos. It goes live in the shop when you save, unless you switch it off."
      />
      <ProductForm row={null} filters={filters} supabase={publicSupabase()} nextSort={nextSort} tryonReady={tryons.ready} />
    </>
  );
}
