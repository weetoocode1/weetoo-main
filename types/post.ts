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

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  deleted_by_admin?: boolean;
  deleted_at?: string;
  deleted_by_user_id?: string;
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    nickname?: string;
    avatar_url?: string;
  };
  deleted_by?: {
    id: string;
    first_name?: string;
    last_name?: string;
    nickname?: string;
  };
  replies?: PostComment[];
}
