import type { Metadata } from 'next';
import { DataError, getAdminAnnouncements } from '@/lib/admin/data';
import { AnnouncementManager } from '@/components/admin/AnnouncementManager';
import { PageHead } from '@/components/admin/fields';
import { SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Top bar' };

export default async function AnnouncementsPage() {
  let rows;
  try {
    rows = await getAdminAnnouncements();
  } catch (e) {
    if (e instanceof DataError) return <><PageHead title="Top bar" /><SetupNotice message={e.message} /></>;
    throw e;
  }
  return (
    <>
      <PageHead
        title="Top bar"
        sub="The black line above the header on every page of the shop. Choose an icon, write the message, and switch it on."
      />
      <AnnouncementManager rows={rows} />
    </>
  );
}
