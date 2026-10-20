import NextLink from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function AdminNotFound() {
  return (
    <div className="adm-card">
      <div className="adm-empty">
        <Icon name="search" />
        <b>Nothing here</b>
        <p>This page does not exist, or the item was deleted.</p>
        <NextLink className="adm-btn" href="/admin"><Icon name="grid" />Back to the dashboard</NextLink>
      </div>
    </div>
  );
}
