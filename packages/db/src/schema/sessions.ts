import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const sessionStatusEnum = pgEnum('session_status', [
  'preparing',
  'live',
  'ended',
  'archived',
]);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 6 }).notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    status: sessionStatusEnum('status').notNull().default('preparing'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A join code is unique only among non-archived sessions, so 6-char codes
    // are recycled once a session is archived.
    uniqueIndex('sessions_code_active_uidx')
      .on(t.code)
      .where(sql`${t.status} <> 'archived'`),
  ],
);

export type SessionRow = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
