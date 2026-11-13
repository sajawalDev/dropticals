import type { Metadata } from 'next';
import NextLink from 'next/link';
import { DataError, getInquiries } from '@/lib/admin/data';
import { INQUIRY_STATUSES, isInquiryStatus } from '@/lib/admin/types';
import { PageHead } from '@/components/admin/fields';
import { InquiriesList } from '@/components/admin/InquiriesList';
import { SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Inquiries' };

export default async function InquiriesPage({ searchParams }: PageProps<'/admin/inquiries'>) {
  const sp = await searchParams;
  const status = isInquiryStatus(sp.status) ? sp.status : '';
  let data;
  try {
    data = await getInquiries(status);
  } catch (e) {
    if (e instanceof DataError) return <><PageHead title="Inquiries" /><SetupNotice message={e.message} /></>;
    throw e;
  }
  if (!data.ready) {
    return <><PageHead title="Inquiries" /><SetupNotice message="The inquiries table is missing. Run the latest supabase/schema.sql to add it." /></>;
  }

  return (
    <>
      <PageHead
        title="Inquiries"
        sub="Messages from the contact page, the moment they are sent. The sender gets a thank-you email straight away; reply by email or WhatsApp, then mark it as replied."
      />
      <nav className="adm-seg adm-scroll-x" aria-label="Filter by status">
        <NextLink href="/admin/inquiries" aria-current={!status ? 'page' : undefined}>All<em>{data.counts.all}</em></NextLink>
        {INQUIRY_STATUSES.map(s => (
          <NextLink key={s.value} href={`/admin/inquiries?status=${s.value}`} aria-current={status === s.value ? 'page' : undefined}>
            {s.label}<em>{data.counts[s.value]}</em>
          </NextLink>
        ))}
      </nav>
      <InquiriesList rows={data.rows} filtered={!!status} />
    </>
  );
}
