CREATE TYPE "public"."session_status" AS ENUM('preparing', 'live', 'ended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."comment_type" AS ENUM('user', 'ai');--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(6) NOT NULL,
	"title" varchar(120) NOT NULL,
	"status" "session_status" DEFAULT 'preparing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"nickname" varchar(40) NOT NULL,
	"content" text NOT NULL,
	"type" "comment_type" DEFAULT 'user' NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_code_active_uidx" ON "sessions" USING btree ("code") WHERE "sessions"."status" <> 'archived';--> statement-breakpoint
CREATE INDEX "comments_session_created_idx" ON "comments" USING btree ("session_id","created_at","id");