import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ImageProcessingService } from './services/image-processing.service';
import { StorageService } from './services/storage.service';
import { IMAGE_CONSTRAINTS } from '../../common/constants/image.constants';
import type { RawUpload, ImageStatus } from '../../common/types/image.types';
import type { Image } from '@prisma/client';

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processing: ImageProcessingService,
    private readonly storage: StorageService,
  ) {}

  // ─── Upload Pipeline ────────────────────────────────────────────────────────

  async upload(file: RawUpload): Promise<Image> {
    // Step 1 + 2 + 3 + 4: validate format, convert, check resolution & blur
    const processed = await this.processing.process(file);
    if (!processed.ok) {
      return this.reject(file, processed.reason);
    }

    const { buffer, mimetype, width, height, hash } = processed.image;

    // Step 5: duplicate / similarity check
    const duplicateReason = await this.checkSimilarity(hash);
    if (duplicateReason) return this.reject(file, duplicateReason, mimetype, buffer.length);

    // Step 6: upload to S3
    let url: string;
    try {
      url = await this.storage.upload(buffer, file.originalname, mimetype);
    } catch (err: any) {
      this.logger.error(`S3 upload failed: ${err.message}`);
      return this.reject(file, `Storage error: ${err.message}`, mimetype, buffer.length);
    }

    // Step 7: face validation via Rekognition
    const s3Key = this.storage.s3Key(file.originalname);
    const faceIssue = await this.storage.detectFaceIssue(process.env.AWS_BUCKET_NAME!, s3Key);
    if (faceIssue) return this.reject(file, faceIssue, mimetype, buffer.length);

    // Step 8: persist accepted record
    return this.prisma.image.create({
      data: { filename: file.originalname, url, status: 'ACCEPTED', mimetype, size: buffer.length, width, height, hash },
    });
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  findAll(): Promise<Image[]> {
    return this.prisma.image.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findByStatus(status: ImageStatus): Promise<Image[]> {
    return this.prisma.image.findMany({ where: { status }, orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string): Promise<Image | null> {
    return this.prisma.image.findUnique({ where: { id } });
  }

  remove(id: string): Promise<Image> {
    return this.prisma.image.delete({ where: { id } });
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  private async checkSimilarity(hash: string): Promise<string | null> {
    const existing = await this.prisma.image.findMany({
      where: { status: 'ACCEPTED', hash: { not: null } },
      select: { hash: true },
    });
    for (const img of existing) {
      if (img.hash && this.processing.hammingDistance(hash, img.hash) < IMAGE_CONSTRAINTS.SIMILARITY_HAMMING_THRESHOLD) {
        return 'Image is too similar to an existing one.';
      }
    }
    return null;
  }

  private reject(file: RawUpload, reason: string, mimetype?: string, size?: number): Promise<Image> {
    return this.prisma.image.create({
      data: {
        filename: file.originalname,
        url: '',
        status: 'REJECTED',
        mimetype: mimetype ?? file.mimetype,
        size: size ?? file.size,
        reason,
      },
    });
  }
}
