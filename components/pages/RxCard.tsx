'use client';

import { useState, type ReactNode } from 'react';
import { reveal } from '@/lib/css';

type Term = 'od' | 'sph' | 'cyl' | 'axis' | 'add' | 'pd';

const TERMS: [string, Term, string][] = [
  ['OD', 'od', 'Oculus dexter, your right eye. OS, oculus sinister, is your left eye.'],
  ['SPH', 'sph', 'Sphere, the main power. A minus number means short-sighted, a plus number means long-sighted.'],
  ['CYL', 'cyl', 'Cylinder corrects astigmatism. Leave it to us if it is blank.'],
  ['AXIS', 'axis', 'A number from 0 to 180 that sets the direction of the cylinder.'],
  ['ADD', 'add', 'Extra power for reading, used in bifocal and progressive lenses. Message us if yours has one.'],
  ['PD', 'pd', 'Pupillary distance, the space between your pupils in millimetres.'],
];

/** A sample prescription; pointing at a term highlights where it sits on the slip. */
export function RxCard({ emblem }: { emblem: ReactNode }) {
  const [term, setTerm] = useState<Term>('sph');
  const hl = (t: Term) => (term === t ? 'hl' : undefined);

  return (
    <div className="rx-card">
      <div className="rx-slip" {...reveal()}>
        <div className="rx-slip__head">
          {emblem}
          <div className="text-right"><b>Spectacle prescription</b><div className="small muted">Sample only</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th scope="col">Eye</th>
              <th scope="col" data-term="sph" className={hl('sph')}>SPH</th>
              <th scope="col" data-term="cyl" className={hl('cyl')}>CYL</th>
              <th scope="col" data-term="axis" className={hl('axis')}>AXIS</th>
              <th scope="col" data-term="add" className={hl('add')}>ADD</th>
            </tr>
          </thead>
          <tbody>
            {[['OD, right', '−2.25', '−0.75', '180'], ['OS, left', '−2.00', '−0.50', '170']].map(([eye, sph, cyl, axis]) => (
              <tr key={eye}>
                <td data-term="od" className={hl('od')}>{eye}</td>
                <td data-term="sph" className={hl('sph')}>{sph}</td>
                <td data-term="cyl" className={hl('cyl')}>{cyl}</td>
                <td data-term="axis" className={hl('axis')}>{axis}</td>
                <td data-term="add" className={hl('add')}>none</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rx-slip__foot">
          <span data-term="pd" className={hl('pd')}>PD 63 mm</span>
          <span className="muted">Valid for 2 years</span>
        </div>
      </div>
      <div className="terms" data-stagger="">
        {TERMS.map(([label, key, text], i) => (
          <button
            key={key}
            type="button"
            aria-pressed={term === key}
            onMouseOver={() => setTerm(key)}
            onFocus={() => setTerm(key)}
            onClick={() => setTerm(key)}
            {...reveal(i)}
          >
            <b>{label}</b><span>{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
