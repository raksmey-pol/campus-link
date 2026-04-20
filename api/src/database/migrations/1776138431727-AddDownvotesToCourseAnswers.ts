import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDownvotesToCourseAnswers1776138431727 implements MigrationInterface {
  name = 'AddDownvotesToCourseAnswers1776138431727';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_answers" ADD "downvotes" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_answers" DROP COLUMN "downvotes"`,
    );
  }
}
