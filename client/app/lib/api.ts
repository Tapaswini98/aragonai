import type { ServerImage } from '../types/image.types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function uploadImage(file: File): Promise<ServerImage> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(`${API}/images/upload`, { method: 'POST', body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `Upload failed (${res.status})`);
  }
  return res.json() as Promise<ServerImage>;
}

export async function fetchImages(): Promise<ServerImage[]> {
  const res = await fetch(`${API}/images`);
  if (!res.ok) throw new Error('Failed to fetch images');
  return res.json() as Promise<ServerImage[]>;
}
