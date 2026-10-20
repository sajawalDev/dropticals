'use server';

import { isBaseMaterial, isBaseShape } from '@/lib/catalog';
import { slugify } from '@/lib/catalog-build';
import { adminDb } from '@/lib/supabase/server';
import { asAdmin, dbMessage, fail, int, isUuid, refresh, str, type ActionResult } from '../guard';
import { FILTER_KINDS, type FilterKind } from '../types';

/* Categories, shapes, materials and colours: the shop's filters. */

export interface FilterInput {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  base?: string;
  short_name?: string;
  style?: string;
  hex?: string;
  is_active: boolean;
}

const STYLES = ['gloss', 'solid', 'clear', 'tint', 'tortoise', 'metal'];
const isKind = (k: unknown): k is FilterKind => FILTER_KINDS.some(f => f.kind === k);
const one = (k: FilterKind) => FILTER_KINDS.find(f => f.kind === k)!.one;

export async function saveFilter(kind: FilterKind, input: FilterInput): Promise<ActionResult<{ id: string }>> {
  return asAdmin(async () => {
    if (!isKind(kind)) return fail('Unknown filter.');
    const name = str(input?.name, 60);
    if (!name) return fail('Give it a name.', 'name');
    const slug = slugify(str(input.slug, 60) || name);
    if (!slug) return fail('The URL name needs letters or numbers.', 'slug');

    const row: Record<string, unknown> = { name, slug, is_active: !!input.is_active };
    if (kind === 'categories' || kind === 'shapes') row.description = str(input.description, 400);
    if (kind === 'shapes') {
      if (!isBaseShape(input.base)) return fail('Choose how the shape is drawn.', 'base');
      row.base = input.base;
    }
    if (kind === 'materials') {
      if (!isBaseMaterial(input.base)) return fail('Choose a drawing style.', 'base');
      row.base = input.base;
      row.short_name = str(input.short_name, 40) || name.toLowerCase();
    }
    if (kind === 'colors') {
      if (!STYLES.includes(String(input.style))) return fail('Choose a finish.', 'style');
      const hex = str(input.hex, 7).toLowerCase();
      if (!/^#[0-9a-f]{6}$/.test(hex)) return fail('Enter a colour like #1a1a1a.', 'hex');
      row.style = input.style;
      row.hex = hex;
    }

    const db = adminDb();
    if (isUuid(input.id)) {
      const { error } = await db.from(kind).update(row).eq('id', input.id);
      if (error) return fail(dbMessage(error, one(kind)), error.code === '23505' ? 'slug' : undefined);
      refresh({ shop: true });
      return { ok: true, id: input.id };
    }
    // New entries go to the end of the list.
    const { data: last } = await db.from(kind).select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await db.from(kind).insert({ ...row, sort_order: (last?.sort_order ?? 0) + 1 }).select('id').single();
    if (error || !data) return fail(dbMessage(error ?? { message: 'Could not save.' }, one(kind)), error?.code === '23505' ? 'slug' : undefined);
    refresh({ shop: true });
    return { ok: true, id: data.id };
  });
}

export async function deleteFilter(kind: FilterKind, id: string): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isKind(kind) || !isUuid(id)) return fail('That entry was not found.');
    const { error } = await adminDb().from(kind).delete().eq('id', id);
    if (error) return fail(dbMessage(error, one(kind)));
    refresh({ shop: true });
    return { ok: true };
  });
}

export async function setFilterActive(kind: FilterKind, id: string, active: boolean): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isKind(kind) || !isUuid(id)) return fail('That entry was not found.');
    const { error } = await adminDb().from(kind).update({ is_active: !!active }).eq('id', id);
    if (error) return fail(dbMessage(error, one(kind)));
    refresh({ shop: true });
    return { ok: true };
  });
}

/** Saves a new order for the list: `ids` from first to last. */
export async function reorderFilters(kind: FilterKind, ids: string[]): Promise<ActionResult> {
  return asAdmin(async () => {
    if (!isKind(kind) || !Array.isArray(ids) || !ids.every(isUuid)) return fail('Could not reorder.');
    const db = adminDb();
    const results = await Promise.all(ids.slice(0, 200).map((id, i) => db.from(kind).update({ sort_order: int(i + 1, 0, 1000) }).eq('id', id)));
    const failed = results.find(r => r.error);
    if (failed?.error) return fail(dbMessage(failed.error));
    refresh({ shop: true });
    return { ok: true };
  });
}
