export type User = {
  id: string;
  username: string;
};

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  imageUri: string;
  caption: string;
  car: string;
  createdAt: number;
  likedBy: string[];
};
