import { ICONS, type IconDef, type IconName } from '@/lib/icons';

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const def: IconDef = ICONS[name];
  return (
    <svg
      className={className}
      viewBox={def.viewBox ?? '0 0 24 24'}
      fill="none"
      stroke="currentColor"
      strokeWidth={def.strokeWidth ?? 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: def.body }}
    />
  );
}
