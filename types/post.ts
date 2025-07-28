export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  avatar_url?: string;
}

export interface PostAuthor {
  id: string;
  name: string;
  nickname?: string;
  avatar?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  board: string;
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  author: PostAuthor;
  images: string[];
  tags: string[];
  isPlaceholder?: boolean;
}

export interface PostPageProps {
  params: Promise<{
    board: string;
    id: string;
  }>;
}

export interface ShowcaseGridProps {
  board: string;
}

export interface LeaderboardTableProps {
  board: string;
}

export interface BoardNames {
  [key: string]: string;
}
