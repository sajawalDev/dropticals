import { finishOf, type Product } from '@/lib/catalog';
import { vars } from '@/lib/css';

/** Colour swatches for a frame; the active one is pressed. */
export function Swatches({ product, active, onPick }: { product: Product; active: string; onPick: (f: string) => void }) {
  if (product.finishes.length < 1) return null;
  return (
    <div className="swatches" role="group" aria-label="Frame colour">
      {product.finishes.map(f => {
        const fin = finishOf(product, f);
        return (
          <button
            key={f}
            className="sw"
            type="button"
            style={vars({ '--sw': fin.swatch })}
            aria-pressed={f === active}
            aria-label={fin.label}
            title={fin.label}
            onClick={() => onPick(f)}
          />
        );
      })}
    </div>
  );
}
