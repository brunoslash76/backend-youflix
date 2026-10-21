import { MigrationInterface, QueryRunner } from "typeorm"

export class AddVideoProcessingMetadata1794100000000 implements MigrationInterface {
  public async up(q: QueryRunner) {
    await q.query(`ALTER TABLE "video_renditions" ADD "progress" integer NOT NULL DEFAULT 0`)
    await q.query(`ALTER TABLE "videos" ADD "storyboard" jsonb`)
  }
  public async down(q: QueryRunner) {
    await q.query(`ALTER TABLE "videos" DROP COLUMN "storyboard"`)
    await q.query(`ALTER TABLE "video_renditions" DROP COLUMN "progress"`)
  }
}