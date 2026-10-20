import { notFound } from 'next/navigation';

/** Unknown dashboard addresses show the dashboard's own "nothing here" page. */
export default function MissingAdminPage() {
  notFound();
}
