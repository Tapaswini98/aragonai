export type ImageStatus = 'ACCEPTED' | 'REJECTED';

export interface RawUpload {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface ValidationResult {
  accepted: boolean;
  reason?: string;
}

export interface ProcessedImage {
  buffer: Buffer;
  mimetype: string;
  width: number;
  height: number;
  hash: string;
}
