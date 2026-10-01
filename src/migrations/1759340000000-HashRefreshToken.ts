import { MigrationInterface, QueryRunner } from "typeorm";

export class HashRefreshTokens1759340000000 implements MigrationInterface {
  name = "HashRefreshTokens1759340000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "tokens"`);
    await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "refreshToken"`);
    await queryRunner.query(`ALTER TABLE "tokens" ADD "refreshTokenHash" character varying(64) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tokens" ADD "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_tokens_refreshTokenHash" ON "tokens" ("refreshTokenHash")`);
    await queryRunner.query(`ALTER TABLE "tokens" ADD CONSTRAINT "FK_tokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tokens" DROP CONSTRAINT "FK_tokens_userId"`);
    await queryRunner.query(`DROP INDEX "UQ_tokens_refreshTokenHash"`);
    await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "expiresAt"`);
    await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "refreshTokenHash"`);
    await queryRunner.query(`ALTER TABLE "tokens" ADD "refreshToken" character varying NOT NULL`);
  }
}