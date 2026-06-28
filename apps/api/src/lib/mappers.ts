import type { CommentRow, NewComment, SessionRow } from '@commentoo/db';
import type { Comment, Session } from '@commentoo/shared';

/** Map a DB comment row to the canonical wire Comment (Date -> ISO string). */
export function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    sessionId: row.sessionId,
    nickname: row.nickname,
    content: row.content,
    type: row.type,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Map a canonical wire Comment to a DB insert row (ISO string -> Date). */
export function commentToRow(comment: Comment): NewComment {
  return {
    id: comment.id,
    sessionId: comment.sessionId,
    nickname: comment.nickname,
    content: comment.content,
    type: comment.type,
    parentId: comment.parentId,
    createdAt: new Date(comment.createdAt),
  };
}

/** Map a DB session row to the canonical wire Session. */
export function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
