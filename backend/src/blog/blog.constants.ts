// BLG-01 / BLG-08 / GEN-08 limits, in one place so the DTOs and tests agree.
export const POST_TITLE_MAX_LENGTH = 150;
export const POST_BODY_MAX_LENGTH = 20000;
export const POST_MAX_TAGS = 5;
export const POST_TAG_MAX_LENGTH = 30;
export const POST_MAX_IMAGES = 5;
/** BLG-05: a comment is not empty and at most 500 characters. */
export const COMMENT_MAX_LENGTH = 500;

/** GEN-05: every list is paginated with page size 10. */
export const BLOG_PAGE_SIZE = 10;

