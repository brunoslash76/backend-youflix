import { MigrationInterface, QueryRunner } from "typeorm"

export class AddVideoModeration1794200000000 implements MigrationInterface {
  public async up(q: QueryRunner) {
    await q.query(`CREATE TYPE "moderation_status_enum" AS ENUM ('pending', 'approved', 'needs_review', 'rejected', 'quarantined')`)
    await q.query(`ALTER TABLE "videos" ADD "moderationStatus" "moderation_status_enum" NOT NULL DEFAULT 'pending'`)
    await q.query(`ALTER TABLE "videos" ADD "moderationReason" text`)
    await q.query(`ALTER TABLE "videos" ADD "moderatedAt" TIMESTAMP WITH TIME ZONE`)
    await q.query(`CREATE INDEX "IDX_videos_moderationStatus" ON "videos" ("moderationStatus")`)
    await q.query(`UPDATE "videos" SET "moderationStatus" = 'needs_review', "moderationReason" = 'legacy_unmoderated' WHERE "status" = 'ready'`)
    await q.query(`
      CREATE TABLE "video_moderations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "videoId" uuid NOT NULL,
        "source" varchar NOT NULL,
        "status" "moderation_status_enum" NOT NULL,
        "reason" text,
        "flags" jsonb NOT NULL DEFAULT '[]',
        "summary" text,
        "model" varchar,
        "costUsd" double precision,
        "reviewerId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_video_moderations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_video_moderations_videoId" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE
      )
    `)
    await q.query(`CREATE INDEX "IDX_video_moderations_videoId" ON "video_moderations" ("videoId")`)
  }

  public async down(q: QueryRunner) {
    await q.query(`DROP TABLE "video_moderations"`)
    await q.query(`DROP INDEX "IDX_videos_moderationStatus"`)
    await q.query(`ALTER TABLE "videos" DROP COLUMN "moderatedAt"`)
    await q.query(`ALTER TABLE "videos" DROP COLUMN "moderationReason"`)
    await q.query(`ALTER TABLE "videos" DROP COLUMN "moderationStatus"`)
    await q.query(`DROP TYPE "moderation_status_enum"`)
  }
}