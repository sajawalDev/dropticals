'use client';

import { useFinePointer } from '@/lib/hooks';

/** Wording that depends on the pointer: "Point at" with a mouse, "Tap" on touch. */
export function PointerText({ fine, touch }: { fine: string; touch: string }) {
  return useFinePointer() ? fine : touch;
}
