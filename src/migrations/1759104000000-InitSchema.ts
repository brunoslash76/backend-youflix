import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1759104000000 implements MigrationInterface {
  name = "InitSchema1759104000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "videos_status_enum" AS ENUM (
      'awaiting_upload',
      'uploaded',
      'analyzing',
      'transcoding',
      'ready',
      'failed'
    )`);

    await queryRunner.query(`CREATE TYPE "video_renditions_status_enum" AS ENUM (
      'pending',
      'encoding',
      'ready',
      'failed'
    )`);

    await queryRunner.query(`CREATE TABLE "users" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "firstName" character varying NOT NULL,
      "lastName" character varying NOT NULL,
      "email" character varying NOT NULL,
      "password" character varying NOT NULL,
      "phone" character varying NOT NULL,
      "isAdmin" boolean NOT NULL DEFAULT false,
      "isActive" boolean NOT NULL DEFAULT false,
      "refreshToken" character varying,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_users_email" UNIQUE ("email"),
      CONSTRAINT "UQ_users_phone" UNIQUE ("phone")
    )`);

    await queryRunner.query(`CREATE TABLE "tokens" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "refreshToken" character varying NOT NULL,
      "isUsed" boolean NOT NULL DEFAULT false,
      "userId" uuid NOT NULL,
      "tokenFamily" character varying NOT NULL,
      "isRevoked" boolean NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_tokens_id" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(`CREATE INDEX "IDX_tokens_tokenFamily" ON "tokens" ("tokenFamily")`);

    await queryRunner.query(`CREATE TABLE "genres" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "name" character varying NOT NULL,
      "slug" character varying NOT NULL,
      CONSTRAINT "PK_genres_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_genres_name" UNIQUE ("name"),
      CONSTRAINT "UQ_genres_slug" UNIQUE ("slug")
    )`);

    await queryRunner.query(`CREATE TABLE "videos" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "contentType" character varying NOT NULL,
      "sizeBytes" bigint NOT NULL,
      "authorId" uuid NOT NULL,
      "publicId" character varying(21) NOT NULL,
      "title" character varying NOT NULL,
      "description" character varying NOT NULL,
      "views" integer NOT NULL DEFAULT 0,
      "likes" integer NOT NULL DEFAULT 0,
      "dislikes" integer NOT NULL DEFAULT 0,
      "isPublic" boolean NOT NULL DEFAULT false,
      "storageKey" character varying,
      "thumbnailKey" character varying,
      "status" "videos_status_enum" NOT NULL DEFAULT 'awaiting_upload',
      "durationSeconds" double precision,
      "sourceWidth" integer,
      "sourceHeight" integer,
      "hlsMasterKey" character varying,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_videos_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_videos_publicId" UNIQUE ("publicId"),
      CONSTRAINT "FK_videos_authorId" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "video_genres" (
      "videosId" uuid NOT NULL,
      "genresId" uuid NOT NULL,
      CONSTRAINT "PK_video_genres" PRIMARY KEY ("videosId", "genresId"),
      CONSTRAINT "FK_video_genres_videosId" FOREIGN KEY ("videosId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "FK_video_genres_genresId" FOREIGN KEY ("genresId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "comments" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "body" text NOT NULL,
      "videoId" uuid NOT NULL,
      "authorId" uuid NOT NULL,
      "parentId" uuid,
      "isDeleted" boolean NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_comments_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_comments_videoId" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_comments_authorId" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_comments_parentId" FOREIGN KEY ("parentId") REFERENCES "comments"("id")
    )`);

    await queryRunner.query(`CREATE INDEX "IDX_comments_videoId" ON "comments" ("videoId")`);
    await queryRunner.query(`CREATE INDEX "IDX_comments_authorId" ON "comments" ("authorId")`);

    await queryRunner.query(`CREATE TABLE "video_renditions" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "videoId" uuid NOT NULL,
      "name" character varying NOT NULL,
      "height" integer NOT NULL,
      "width" integer NOT NULL,
      "bitrateKbps" integer NOT NULL,
      "playlistKey" character varying NOT NULL,
      "bytes" bigint NOT NULL DEFAULT 0,
      "status" "video_renditions_status_enum" NOT NULL DEFAULT 'pending',
      "errorMessage" text,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_video_renditions_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_video_renditions_videoId_name" UNIQUE ("videoId", "name"),
      CONSTRAINT "FK_video_renditions_videoId" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "video_renditions"`);
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(`DROP TABLE "video_genres"`);
    await queryRunner.query(`DROP TABLE "videos"`);
    await queryRunner.query(`DROP TABLE "genres"`);
    await queryRunner.query(`DROP TABLE "tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "video_renditions_status_enum"`);
    await queryRunner.query(`DROP TYPE "videos_status_enum"`);
  }
}
