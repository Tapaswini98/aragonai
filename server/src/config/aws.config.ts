import AWS from 'aws-sdk';

export function createS3(): AWS.S3 {
  return new AWS.S3({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
}

export function createRekognition(): AWS.Rekognition {
  return new AWS.Rekognition({
    region: process.env.AWS_REKOGNITION_REGION ?? 'eu-west-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
}

export function s3Key(filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  return `images/${Date.now()}-${safe}`;
}
