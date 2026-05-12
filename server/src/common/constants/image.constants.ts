export const ALLOWED_MIME_TYPES = ['image/heic', 'image/png', 'image/jpeg'] as const;

export const IMAGE_CONSTRAINTS = {
  MIN_DIMENSION: 200,
  BLUR_STDEV_THRESHOLD: 15,
  SIMILARITY_HAMMING_THRESHOLD: 10,
  PERCEPTUAL_HASH_SIZE: 8,
  MIN_FACE_AREA_RATIO: 0.05, // relative bounding-box area (W * H)
} as const;
