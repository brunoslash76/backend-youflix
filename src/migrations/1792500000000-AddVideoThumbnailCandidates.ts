import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVideoThumbnailCandidates1792500000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "videos" ADD "thumbnailCandidateKeys" text array NOT NULL DEFAULT '{}'`);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "thumbnailCandidateKeys"`);
    }
}
