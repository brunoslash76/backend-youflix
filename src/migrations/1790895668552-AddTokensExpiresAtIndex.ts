import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTokensExpiresAtIndex1790895668552 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_tokens_expiresAt" ON "tokens" ("expiresAt")`);
      }
      public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_tokens_expiresAt"`);
      }

}
