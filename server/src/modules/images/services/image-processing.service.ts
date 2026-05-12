import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { ALLOWED_MIME_TYPES, IMAGE_CONSTRAINTS } from '../../../common/constants/image.constants';
import type { RawUpload, ValidationResult, ProcessedImage } from '../../../common/types/image.types';

@Injectable()
export class ImageProcessingService {
  /**
   * Validates format, converts HEIC, checks resolution, blur and returns a
   * fully-processed image ready for storage + similarity check.
   */
  async process(file: RawUpload): Promise<
    { ok: true; image: ProcessedImage } | { ok: false; reason: string }
  > {
    // 1 — format check
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      return { ok: false, reason: `Invalid format. Only ${ALLOWED_MIME_TYPES.join(', ')} allowed.` };
    }

    // 2 — HEIC → JPEG
    let { buffer, mimetype } = file;
    if (mimetype === 'image/heic') {
      buffer = Buffer.from(await heicConvert({ buffer, format: 'JPEG', quality: 1 }));
      mimetype = 'image/jpeg';
    }

    // 3 — resolution
    const { width = 0, height = 0 } = await sharp(buffer).metadata();
    const { MIN_DIMENSION } = IMAGE_CONSTRAINTS;
    if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
      return { ok: false, reason: `Image too small (${width}×${height}). Min ${MIN_DIMENSION}×${MIN_DIMENSION} required.` };
    }

    // 4 — blur (pixel standard deviation)
    const stats = await sharp(buffer).grayscale().stats();
    const blurScore = stats.channels[0].stdev;
    if (blurScore < IMAGE_CONSTRAINTS.BLUR_STDEV_THRESHOLD) {
      return { ok: false, reason: `Image too blurry (sharpness score: ${blurScore.toFixed(1)}).` };
    }

    // 5 — perceptual hash
    const hash = await this.computePerceptualHash(buffer);

    return { ok: true, image: { buffer, mimetype, width, height, hash } };
  }

  async computePerceptualHash(buffer: Buffer): Promise<string> {
    const size = IMAGE_CONSTRAINTS.PERCEPTUAL_HASH_SIZE;
    const pixels = await sharp(buffer).resize(size, size).grayscale().raw().toBuffer();
    const mean = pixels.reduce((sum: number, v: number) => sum + v, 0) / pixels.length;
    return Array.from(pixels).map((v: number) => (v >= mean ? '1' : '0')).join('');
  }

  hammingDistance(a: string, b: string): number {
    return [...a].reduce((d, c, i) => d + (c !== b[i] ? 1 : 0), 0);
  }
}
