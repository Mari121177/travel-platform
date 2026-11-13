// BLG-01 / BLG-08 / GEN-08 limits, in one place so the DTOs and tests agree.
export const POST_TITLE_MAX_LENGTH = 150;
export const POST_BODY_MAX_LENGTH = 20000;
export const POST_MAX_TAGS = 5;
export const POST_TAG_MAX_LENGTH = 30;
export const POST_MAX_IMAGES = 5;

/** GEN-05: every list is paginated with page size 10. */
export const BLOG_PAGE_SIZE = 10;

/**
 * Same pattern as UPLOAD_URL_REGEX in uploads/upload.constants.ts. It is copied
 * here so this branch does not depend on the uploads PR (#16). After #16 is
 * merged, replace this with:
 *   import { UPLOAD_URL_REGEX } from '../uploads/upload.constants';
 */
export const POST_IMAGE_URL_REGEX =
  /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/;
