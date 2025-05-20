// src/types/comment.types.ts
export interface SharedCommentWithAuthor {
  id: string;
  user_id: string; // The original commenter's auth.users.id
  snapshot_id: string;
  parent_comment_id: string | null;
  comment_text: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string; // This corresponds to user_profiles.id (which is also auth.users.id)
    username?: string | null;
    avatar_url?: string | null;
  } | null;
}
