import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVideoThumbnailVariants1792700000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "videos"
            ADD "thumbnailSmallKey" character varying,
            ADD "thumbnailMediumKey" character varying,
            ADD "thumbnailLargeKey" character varying
        `);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "videos"
            DROP COLUMN "thumbnailLargeKey",
            DROP COLUMN "thumbnailMediumKey",
            DROP COLUMN "thumbnailSmallKey"
        `);
    }
}