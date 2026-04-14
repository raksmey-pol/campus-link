import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddItemResolveColumns1776138431725 implements MigrationInterface {
  name = 'AddItemResolveColumns1776138431725';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "items" ADD "finder_confirmed" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD "claimer_confirmed" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" DROP CONSTRAINT "FK_965cfea509109808171b39ff65f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ALTER COLUMN "reporter_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "FK_965cfea509109808171b39ff65f" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "items" DROP CONSTRAINT "FK_965cfea509109808171b39ff65f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ALTER COLUMN "reporter_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "FK_965cfea509109808171b39ff65f" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" DROP COLUMN "claimer_confirmed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" DROP COLUMN "finder_confirmed"`,
    );
  }
}
