const ALLOWED_MIME = new Set(['image/heic', 'image/png', 'image/jpeg', 'image/jpg']);
const ALLOWED_EXT = /\.(heic|png|jpe?g)$/i;

export function validateImageFile(file: File): { valid: boolean; reason?: string } {
  if (!ALLOWED_MIME.has(file.type) && !ALLOWED_EXT.test(file.name)) {
    return { valid: false, reason: `"${file.name}" is not a supported format. Use HEIC, PNG or JPEG.` };
  }
  return { valid: true };
}
