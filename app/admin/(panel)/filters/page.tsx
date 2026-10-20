import type { Metadata } from 'next';
import { DataError, getFilterRows, getFilterUsage } from '@/lib/admin/data';
import { FILTER_KINDS, type FilterKind } from '@/lib/admin/types';
import { PageHead } from '@/components/admin/fields';
import { FilterManager } from '@/components/admin/FilterManager';
import { SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Filters' };

export default async function FiltersPage({ searchParams }: PageProps<'/admin/filters'>) {
  const { tab } = await searchParams;
  const initialTab: FilterKind = FILTER_KINDS.find(k => k.kind === tab)?.kind ?? 'categories';
  let filters, usage;
  try {
    [filters, usage] = await Promise.all([getFilterRows(), getFilterUsage()]);
  } catch (e) {
    if (e instanceof DataError) return <><PageHead title="Filters" /><SetupNotice message={e.message} /></>;
    throw e;
  }
  return (
    <>
      <PageHead
        title="Filters"
        sub="The categories, shapes, materials and colours customers filter the shop by. Hidden ones stay on their products but leave the filter list."
      />
      <FilterManager filters={filters} usage={usage} initialTab={initialTab} />
    </>
  );
}
