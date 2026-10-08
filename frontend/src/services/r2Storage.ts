import { supabase, hasSupabase } from './supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export interface StoredAttachment { id: string; name: string; type: string; size: number; createdAt: string; url: string }

function validate(files: File[]): void {
  if (files.length > 3) throw new Error('Maksimal 3 lampiran per pembayaran.');
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error(`Format ${file.name} tidak didukung.`);
    if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} melebihi batas 5 MB.`);
  }
}

/**
 * Upload bukti pembayaran ke Cloudflare R2 (via Supabase Edge Function).
 * Return array berisi ID lampiran. Nilai yang disimpan = public URL + metadata,
 * dikodekan agar tetap kompatibel dengan kolom `attachmentIds: string[]`.
 *
 * Fallback: bila Supabase belum dikonfigurasi, simpan ke IndexedDB (mode demo).
 */
export async function saveAttachments(files: File[]): Promise<string[]> {
  validate(files);

  // Path R2 bila Supabase tersedia.
  if (hasSupabase()) {
    const ids: string[] = [];
    let r2Ok = 0;
    for (const file of files) {
      try {
        const id = await uploadToR2(file);
        ids.push(id);
        r2Ok++;
      } catch {
        // R2 gagal (CORS bucket belum diset / edge down / jaringan) —
        // jangan gagalkan seluruh aksi user ("Failed to fetch"): fallback
        // ke IndexedDB lokal. File tetap tersimpan & bisa diverifikasi;
        // sinkronisasi antar-perangkat lampiran menyusul setelah CORS R2
        // diaktifkan di Cloudflare dashboard.
        const fallbackIds = await saveToIndexedDb([file]);
        ids.push(...fallbackIds);
      }
    }
    if (r2Ok === 0) console.warn('[r2Storage] semua upload R2 gagal — memakai IndexedDB lokal');
    return ids;
  }

  // Fallback IndexedDB (demo lokal).
  return saveToIndexedDb(files);
}

async function uploadToR2(file: File): Promise<string> {
  const client = supabase();
  if (!client) throw new Error('Supabase tidak tersedia.');

  // 1) Minta presigned URL dari edge function.
  const { data, error } = await client.functions.invoke('upload-url', {
    body: { fileName: file.name, contentType: file.type },
  });
  if (error) throw new Error(error.message || 'Gagal meminta URL upload.');

  const { signedUrl, publicUrl, key } = data as { signedUrl: string; publicUrl: string; key: string };
  if (!signedUrl) throw new Error('URL upload tidak valid.');

  // 2) Upload file langsung ke R2.
  const put = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload gagal (${put.status}).`);

  // 3) Simpan URL publik sebagai ID (agar bisa dibuka nanti).
  // Encode JSON berisi url + name + type agar satu string menyimpan semua info.
  return JSON.stringify({
    url: publicUrl,
    key,
    name: file.name,
    type: file.type,
    size: file.size,
  });
}

function saveToIndexedDb(files: File[]): Promise<string[]> {
  return import('./attachmentDb').then(({ saveAttachments: idxSave }) => idxSave(files));
}

/** Baca info lampiran dari id tersimpan (bisa URL R2 atau id IndexedDB). */
export function parseAttachmentId(id: string): { url?: string; name?: string; type?: string; isR2: boolean } {
  try {
    const parsed = JSON.parse(id);
    if (parsed && typeof parsed === 'object' && parsed.url) {
      return { url: parsed.url, name: parsed.name, type: parsed.type, isR2: true };
    }
  } catch { /* bukan JSON → kemungkinan id IndexedDB */ }
  return { isR2: false };
}

/** Ambil lampiran (untuk tampilan). Return {url} bila R2, atau blob bila IndexedDB. */
export async function getAttachment(id: string): Promise<{ name: string; type: string; size: number; createdAt: string; url?: string; blob?: Blob } | undefined> {
  const parsed = parseAttachmentId(id);
  if (parsed.isR2 && parsed.url) {
    return {
      name: parsed.name ?? 'lampiran',
      type: parsed.type ?? 'application/octet-stream',
      size: 0,
      createdAt: new Date().toISOString(),
      url: parsed.url,
    };
  }
  const idx = await import('./attachmentDb').then(({ getAttachment: idxGet }) => idxGet(id));
  if (!idx) return undefined;
  return { name: idx.name, type: idx.type, size: idx.size, createdAt: idx.createdAt, blob: idx.blob };
}
