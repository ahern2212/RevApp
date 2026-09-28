export type User = {
  id: string;
  username: string;
};

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  imagePath: string;
  /** For videos this is the poster frame; for carousels, the first photo. */
  imageUri: string;
  /** Carousel photos after the first (empty for single photos and videos). */
  extraImagePaths: string[];
  /** Every photo in order (just imageUri unless it's a carousel). */
  imageUris: string[];
  videoPath: string | null;
  videoUri: string | null;
  /** The garage car tagged in this post, if any. */
  carId: string | null;
  /** The car meet tagged in this post, if any. */
  eventId: string | null;
  caption: string;
  car: string;
  createdAt: number;
  likedBy: string[];
  commentCount: number;
};
