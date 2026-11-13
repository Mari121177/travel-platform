// BLG-01: a post is saved as a draft (only the author sees it) or published.
export const PostStatus = {
  Draft: 'draft',
  Published: 'published',
} as const;

export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus];
