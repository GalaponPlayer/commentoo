import {
  type AnyPgColumn,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sessions } from './sessions';

export const commentTypeEnum = pgEnum('comment_type', ['user', 'ai']);

export const comments = pgTable(
  'comments',
  {
    // The SessionRoom Durable Object assigns the id (UUIDv7) so the broadcast id
    // equals the persisted id — no client-side default here.
    id: uuid('id').primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    nickname: varchar('nickname', { length: 40 }).notNull(),
    content: text('content').notNull(),
    type: commentTypeEnum('type').notNull().default('user'),
    // Self-FK for AI replies (Phase 5). AnyPgColumn breaks the circular type.
    parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Backs the keyset cursor query: WHERE session_id = ? AND (created_at, id) > (?, ?).
    index('comments_session_created_idx').on(t.sessionId, t.createdAt, t.id),
  ],
);

export type CommentRow = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
