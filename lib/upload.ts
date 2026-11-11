import { isHeic, photoBitmap, unreadable } from './heic';
import { browserSupabase } from './realtime';
import type { PublicSupabase } from './supabase/env';

/* Uploads from the browser straight to Supabase Storage, through a one-time link made by the server. */

export async function uploadSigned(cfg: PublicSupabase, bucket: string, path: string, token: string, file: Blob, contentType: string) {
  const db = await browserSupabase(cfg);
  const { error } = await db.storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(error.message);
}

/**
 * Shrinks a large photo before upload: at most `max` pixels on the long side, as WebP
 * (JPEG where WebP is not supported). Small files, GIFs and SVGs are sent as they are.
 * iPhone (HEIC) photos are always converted, as most browsers cannot show them.
 */
export async function shrinkImage(file: File, max = 2000): Promise<{ blob: Blob; type: string; width: number; height: number }> {
  const keep = async () => {
    const dims = await imageSize(file).catch(() => ({ width: 0, height: 0 }));
    return { blob: file as Blob, type: file.type, ...dims };
  };
  const heic = await isHeic(file);
  if (!heic && !/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return keep();
  try {
    const bitmap = await photoBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale);
    if (!heic && scale === 1 && file.size < 900 * 1024) { bitmap.close(); return { blob: file, type: file.type, width, height }; }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const encode = (type: string) => new Promise<Blob | null>(r => canvas.toBlob(r, type, 0.86));
    const webp = await encode('image/webp');
    const blob = webp?.type === 'image/webp' ? webp : await encode('image/jpeg');
    if (heic) {
      if (!blob) throw new Error(unreadable(file.name, true));
      return { blob, type: blob.type, width, height };
    }
    if (!blob || blob.size >= file.size) return { blob: file, type: file.type, width, height };
    return { blob, type: blob.type, width, height };
  } catch (e) {
    // An iPhone photo that cannot be opened cannot be sent as it is either: say so.
    if (heic) throw e instanceof Error && e.message.includes(file.name) ? e : new Error(unreadable(file.name, true));
    return keep();
  }
}

function imageSize(file: Blob) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { reject(new Error('Not an image')); URL.revokeObjectURL(url); };
    img.src = url;
  });
}
