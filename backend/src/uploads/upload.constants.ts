import { join } from 'path';

// GEN-08: JPG or PNG only, up to 5 MB per image
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'];

// Files are saved here (backend/uploads when the backend runs from backend/)
export const UPLOADS_DIR = join(process.cwd(), 'uploads');

// URL prefix the files are served under (no /api prefix)
export const UPLOADS_URL_PREFIX = '/uploads';

/**
 * Matches the URLs this module returns, for example "/uploads/<uuid>.jpg".
 * Other modules (hotel photos, airline logos, posts, activities) use it to
 * check that an image URL really came from our upload endpoint:
 *   @Matches(UPLOAD_URL_REGEX, { each: true })
 */
export const UPLOAD_URL_REGEX =
  /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/;
