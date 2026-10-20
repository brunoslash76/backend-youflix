import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserUsername1792600000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "username" character varying`);

        await queryRunner.query(`
            WITH base AS (
                SELECT
                    id,
                    lower(regexp_replace(split_part(email, '@', 1), '[^a-z0-9._]', '', 'g')) AS raw
                FROM "users"
            ),
            cleaned AS (
                SELECT id, CASE WHEN raw = '' THEN 'user' ELSE left(raw, 30) END AS stem
                FROM base
            ),
            ranked AS (
                SELECT id, stem, row_number() OVER (PARTITION BY stem ORDER BY id) AS n
                FROM cleaned
            )
            UPDATE "users" AS u
            SET "username" = CASE WHEN r.n = 1 THEN r.stem ELSE r.stem || r.n::text END
            FROM ranked AS r
            WHERE u.id = r.id
        `);

        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_users_username" UNIQUE ("username")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_users_username"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
    }
}
