import { FINISHES, type FinishKey } from '@/lib/catalog';
import { vars } from '@/lib/css';

/** Finish swatches for a frame; the active one is pressed. */
export function Swatches({ finishes, active, onPick }: { finishes: FinishKey[]; active: FinishKey; onPick: (f: FinishKey) => void }) {
  return (
    <div className="swatches" role="group" aria-label="Frame colour">
      {finishes.map(f => (
        <button
          key={f}
          className="sw"
          type="button"
          style={vars({ '--sw': FINISHES[f].swatch })}
          aria-pressed={f === active}
          aria-label={FINISHES[f].label}
          title={FINISHES[f].label}
          onClick={() => onPick(f)}
        />
      ))}
    </div>
  );
}
