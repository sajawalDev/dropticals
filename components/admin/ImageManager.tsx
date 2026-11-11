'use client';

import { useRef, useState, type DragEvent } from 'react';
import { discardUploads, prepareImageUpload } from '@/lib/admin/actions/products';
import type { ColorRow } from '@/lib/catalog-build';
import { cx } from '@/lib/css';
import type { PublicSupabase } from '@/lib/supabase/env';
import { shrinkImage, uploadSigned } from '@/lib/upload';
import { Icon } from '@/components/ui/Icon';
import { Badge } from './fields';
import { toastError } from './feedback';

export interface EditableImage {
  key: string;
  id?: string;
  path: string;
  url: string;
  alt: string;
  colorId: string | null;
  width: number | null;
  height: number | null;
  /** A local preview while the file uploads. */
  preview?: string;
  uploading?: boolean;
}

export const MAX_IMAGES = 12;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif,.heic,.heif';

/** Product photos: upload (straight to storage), describe, tie to a colour, reorder and remove. */
export function ImageManager({ images, onChange, colors, supabase, productName }: {
  images: EditableImage[];
  onChange: (update: (list: EditableImage[]) => EditableImage[]) => void;
  colors: ColorRow[];
  supabase: PublicSupabase | null;
  productName: string;
}) {
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const uploading = images.some(i => i.uploading);

  const patch = (key: string, p: Partial<EditableImage>) => onChange(list => list.map(i => (i.key === key ? { ...i, ...p } : i)));

  const upload = async (files: File[]) => {
    if (!supabase) { toastError('Uploads need the Supabase settings. Check the environment variables.'); return; }
    const room = MAX_IMAGES - images.length;
    if (room <= 0) { toastError(`A product can have up to ${MAX_IMAGES} photos.`); return; }
    // Windows often gives iPhone photos no type at all, so go by the name too.
    const picked = files.filter(f => f.type.startsWith('image/') || /.hei[cf]$/i.test(f.name)).slice(0, room);
    if (picked.length < files.length) toastError(files.length > room ? `Only ${room} more photo${room === 1 ? '' : 's'} fit.` : 'Only image files can be added.');

    await Promise.all(picked.map(async file => {
      const key = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      onChange(list => [...list, { key, path: '', url: '', alt: '', colorId: null, width: null, height: null, preview, uploading: true }]);
      try {
        const small = await shrinkImage(file);
        const name = file.name.replace(/\.[^.]+$/, '') + '.' + (small.type.split('/')[1] === 'jpeg' ? 'jpg' : small.type.split('/')[1]);
        const link = await prepareImageUpload({ name, type: small.type, size: small.blob.size });
        if (!link.ok) throw new Error(link.error);
        await uploadSigned(supabase, 'product-images', link.path, link.token, small.blob, link.contentType);
        patch(key, { path: link.path, url: link.url, width: small.width || null, height: small.height || null, uploading: false });
      } catch (e) {
        onChange(list => list.filter(i => i.key !== key));
        toastError(`${file.name}: ${e instanceof Error ? e.message : 'upload failed'}`);
      } finally {
        URL.revokeObjectURL(preview);
      }
    }));
  };

  const remove = (img: EditableImage) => {
    onChange(list => list.filter(i => i.key !== img.key));
    // A photo uploaded in this visit and never saved is cleaned up straight away.
    if (!img.id && img.path) discardUploads([img.path]).catch(() => {});
  };

  const move = (key: string, by: number) => onChange(list => {
    const i = list.findIndex(x => x.key === key), j = i + by;
    if (i < 0 || j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    upload(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="grid gap-3">
      {images.length < MAX_IMAGES && (
        <label
          className={cx('adm-drop', dragging && 'drag')}
          onDragEnter={e => { e.preventDefault(); setDragging(true); }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <Icon name="upload" />
          <b>{uploading ? 'Uploading…' : 'Drop photos here, or click to choose'}</b>
          <small>JPG, PNG, WebP, AVIF, GIF or iPhone (HEIC) photos. Large photos are resized before upload. Up to {MAX_IMAGES} photos.</small>
          <input ref={input} type="file" accept={ACCEPT} multiple aria-label="Add photos"
            onChange={e => { upload(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        </label>
      )}

      {images.length > 0 ? (
        <div className="adm-images">
          {images.map((img, i) => (
            <div className="adm-image" key={img.key}>
              <div className="adm-image__pic">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded or local file */}
                <img src={img.preview ?? img.url} alt={img.alt || `${productName} photo ${i + 1}`} />
                {i === 0 && <span className="adm-image__cover"><Badge tone="ink">Cover</Badge></span>}
                {img.uploading && <span className="adm-image__busy">Uploading…</span>}
              </div>
              <div className="adm-image__body">
                <input className="adm-input" value={img.alt} maxLength={160} placeholder="Describe the photo"
                  aria-label={`Description of photo ${i + 1}`} onChange={e => patch(img.key, { alt: e.target.value })} disabled={img.uploading} />
                <select className="adm-select" value={img.colorId ?? ''} aria-label={`Colour shown in photo ${i + 1}`}
                  onChange={e => patch(img.key, { colorId: e.target.value || null })} disabled={img.uploading}>
                  <option value="">Any colour</option>
                  {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="adm-image__tools">
                  <span className="flex gap-1">
                    <button className="adm-icon-btn" type="button" aria-label="Move earlier" title="Move earlier" disabled={i === 0} onClick={() => move(img.key, -1)}><Icon name="arrowLeft" /></button>
                    <button className="adm-icon-btn" type="button" aria-label="Move later" title="Move later" disabled={i === images.length - 1} onClick={() => move(img.key, 1)}><Icon name="chevRight" /></button>
                    {i > 0 && <button className="adm-icon-btn" type="button" aria-label="Make cover photo" title="Make cover photo" onClick={() => move(img.key, -i)}><Icon name="star" /></button>}
                  </span>
                  <button className="adm-icon-btn adm-icon-btn--danger" type="button" aria-label="Remove photo" title="Remove photo" disabled={img.uploading} onClick={() => remove(img)}><Icon name="trash" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="adm-small adm-muted">No photos yet. Until you add one, the shop shows the frame&apos;s drawing.</p>
      )}
    </div>
  );
}
