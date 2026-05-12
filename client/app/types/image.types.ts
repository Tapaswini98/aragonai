export type ImageStatus = 'ACCEPTED' | 'REJECTED';
export type UploadPhase = 'idle' | 'uploading' | 'done';
export type UploadState = 'pending' | 'uploading' | 'done' | 'error';

export interface ServerImage {
  id: string;
  filename: string;
  url: string;
  status: ImageStatus;
  mimetype: string;
  size: number;
  reason?: string | null;
  createdAt: string;
}

export interface UploadEntry {
  file: File;
  preview: string;
  clientStatus: ImageStatus;
  clientReason?: string;
  serverResult?: ServerImage;
  uploadState?: UploadState;
}
