export type User = {
  id: string;
  username: string;
};

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  imagePath: string;
  /** For videos this is the poster frame. */
  imageUri: string;
  videoPath: string | null;
  videoUri: string | null;
  caption: string;
  car: string;
  createdAt: number;
  likedBy: string[];
  commentCount: number;
};
