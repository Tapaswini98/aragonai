import { Injectable, Logger } from '@nestjs/common';
import AWS from 'aws-sdk';
import { createS3, createRekognition, s3Key } from '../../../config/aws.config';
import { IMAGE_CONSTRAINTS } from '../../../common/constants/image.constants';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  /** Upload buffer to S3 and return { url, key } */
  async upload(buffer: Buffer, filename: string, mimetype: string): Promise<{ url: string; key: string }> {
    const key = s3Key(filename);
    const result = await createS3().upload({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    }).promise();
    return { url: result.Location, key };
  }

  /** Delete an object from S3 (used to clean up rejected uploads) */
  async delete(key: string): Promise<void> {
    try {
      await createS3().deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
      }).promise();
    } catch (err: any) {
      this.logger.warn(`S3 delete failed for ${key}: ${err.message}`);
    }
  }

  /**
   * Face validation directly from buffer (before S3 upload).
   * Returns rejection reason or null if the image passes.
   */
  async detectFaceIssueFromBuffer(buffer: Buffer): Promise<string | null> {
    const rekognition = createRekognition();
    try {
      const { FaceDetails: faces = [] } = await rekognition.detectFaces({
        Image: { Bytes: buffer },
        Attributes: ['DEFAULT'],
      }).promise();

      if (faces.length === 0) return 'No face detected in the image.';
      if (faces.length > 1) return `Multiple faces detected (${faces.length}). Only single-face images are allowed.`;

      const bb = faces[0].BoundingBox ?? {};
      const area = (bb.Width ?? 0) * (bb.Height ?? 0);
      if (area < IMAGE_CONSTRAINTS.MIN_FACE_AREA_RATIO) {
        return 'Detected face is too small. Move closer to the camera.';
      }
      return null;
    } catch (err: any) {
      this.logger.error(`Rekognition face check failed: ${err.message}`);
      return 'Face validation service unavailable. Please try again.';
    }
  }

  s3Key = s3Key;
}
