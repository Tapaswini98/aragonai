import { Injectable, Logger } from '@nestjs/common';
import AWS from 'aws-sdk';
import { createS3, createRekognition, s3Key } from '../../../config/aws.config';
import { IMAGE_CONSTRAINTS } from '../../../common/constants/image.constants';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  async upload(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
    const key = s3Key(filename);
    const result = await createS3().upload({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    }).promise();
    return result.Location;
  }

  /**
   * Returns a rejection reason string if the image fails face checks,
   * or null if it passes (or if Rekognition is unavailable).
   */
  async detectFaceIssue(s3Bucket: string, s3ObjectKey: string): Promise<string | null> {
    const rekognition = createRekognition();
    try {
      const { FaceDetails: faces = [] } = await rekognition.detectFaces({
        Image: { S3Object: { Bucket: s3Bucket, Name: s3ObjectKey } },
        Attributes: ['DEFAULT'],
      }).promise();

      if (faces.length === 0) return 'No face detected in the image.';
      if (faces.length > 1) return 'Multiple faces detected.';

      const bb = faces[0].BoundingBox ?? {};
      const area = (bb.Width ?? 0) * (bb.Height ?? 0);
      if (area < IMAGE_CONSTRAINTS.MIN_FACE_AREA_RATIO) {
        return 'Detected face is too small.';
      }
      return null;
    } catch (err: any) {
      this.logger.warn(`Rekognition unavailable — face check skipped: ${err.message}`);
      return null; // graceful degradation
    }
  }

  s3Key = s3Key; // expose for re-use by caller
}
