/* =========================================================
   iPhone photos (HEIC/HEIF). Safari opens them; Chrome,
   Edge and Firefox do not. There they are decoded on the
   device with libheif (the heic-to package), which is only
   downloaded when such a photo is picked.
   ========================================================= */

type HeicLib = typeof import('heic-to/next');
let lib: Promise<HeicLib> | null = null;

function load() {
  lib ??= import('heic-to/next').catch(e => { lib = null; throw e; });
  return lib;
}

const BRANDS = /^(heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1)$/;

/** True for HEIC/HEIF photos, by their type, their name or their first bytes. */
export async function isHeic(file: Blob & { name?: string }): Promise<boolean> {
  if (/^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name ?? '')) return true;
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const text = (a: number, b: number) => String.fromCharCode(...head.slice(a, b));
    return text(4, 8) === 'ftyp' && BRANDS.test(text(8, 12));
  } catch {
    return false;
  }
}

/** A HEIC photo, decoded: by the browser where it can, else by libheif. Turned the right way up. */
export async function heicBitmap(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    const { heicTo } = await load();
    return heicTo({ blob: file, type: 'bitmap' });
  }
}

/** Any photo as an ImageBitmap, iPhone photos included. Throws when it cannot be opened. */
export async function photoBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch (e) {
    if (!(await isHeic(file))) throw e;
    return heicBitmap(file);
  }
}

/** The message for a photo that could not be opened. */
export const unreadable = (name: string, heic: boolean) => heic
  ? `${name} is an iPhone photo that could not be opened. Try exporting it from the iPhone as a JPG.`
  : `${name} could not be opened. Use a JPG, PNG or iPhone (HEIC) photo.`;
