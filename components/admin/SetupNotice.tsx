import { Icon } from '@/components/ui/Icon';

/** Shown when the database cannot be read, usually because supabase/schema.sql has not been run yet. */
export function SetupNotice({ message }: { message: string }) {
  return (
    <div className="adm-card">
      <div className="adm-empty">
        <Icon name="info" />
        <b>The dashboard cannot read the database yet</b>
        <p>{message}</p>
        <p>Open Supabase, go to SQL Editor, paste the contents of <code>supabase/schema.sql</code> and press Run. Then reload this page.</p>
      </div>
    </div>
  );
}
