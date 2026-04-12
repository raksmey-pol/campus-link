import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class LocalAuthAndRefreshTokens1775942400000 implements MigrationInterface {
  name = 'LocalAuthAndRefreshTokens1775942400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) {
      await queryRunner.createTable(
        new Table({
          name: 'users',
          columns: [
            {
              name: 'id',
              type: 'integer',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'google_id',
              type: 'character varying',
              length: '255',
              isUnique: true,
              isNullable: true,
            },
            {
              name: 'email',
              type: 'character varying',
              length: '255',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'password_hash',
              type: 'character varying',
              length: '255',
              isNullable: true,
            },
            {
              name: 'display_name',
              type: 'character varying',
              length: '100',
              isNullable: false,
            },
            {
              name: 'avatar_url',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'role',
              type: 'enum',
              enumName: 'users_role_enum',
              enum: ['USER', 'MENTOR', 'MODERATOR', 'ADMIN'],
              default: "'USER'",
              isNullable: false,
            },
            {
              name: 'telegram_id',
              type: 'character varying',
              length: '100',
              isNullable: true,
            },
            {
              name: 'civic_points',
              type: 'integer',
              default: 0,
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamptz',
              isNullable: false,
              default: 'now()',
            },
            {
              name: 'updated_at',
              type: 'timestamptz',
              isNullable: false,
              default: 'now()',
            },
          ],
        }),
      );
    } else {
      const hasGoogleId = await queryRunner.hasColumn('users', 'google_id');
      if (hasGoogleId) {
        await queryRunner.query(
          'ALTER TABLE "users" ALTER COLUMN "google_id" DROP NOT NULL',
        );
      }

      const hasPasswordHash = await queryRunner.hasColumn(
        'users',
        'password_hash',
      );
      if (!hasPasswordHash) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: 'password_hash',
            type: 'character varying',
            length: '255',
            isNullable: true,
          }),
        );
      }
    }

    const hasRefreshTokensTable = await queryRunner.hasTable(
      'auth_refresh_tokens',
    );
    if (!hasRefreshTokensTable) {
      await queryRunner.createTable(
        new Table({
          name: 'auth_refresh_tokens',
          columns: [
            {
              name: 'id',
              type: 'integer',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'token_id',
              type: 'character varying',
              length: '64',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'token_hash',
              type: 'character varying',
              length: '128',
              isNullable: false,
            },
            {
              name: 'expires_at',
              type: 'timestamptz',
              isNullable: false,
            },
            {
              name: 'revoked_at',
              type: 'timestamptz',
              isNullable: true,
            },
            {
              name: 'revoke_reason',
              type: 'character varying',
              length: '100',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamptz',
              isNullable: false,
              default: 'now()',
            },
            {
              name: 'updated_at',
              type: 'timestamptz',
              isNullable: false,
              default: 'now()',
            },
            {
              name: 'user_id',
              type: 'integer',
              isNullable: false,
            },
          ],
        }),
      );

      await queryRunner.createForeignKey(
        'auth_refresh_tokens',
        new TableForeignKey({
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasRefreshTokensTable = await queryRunner.hasTable(
      'auth_refresh_tokens',
    );
    if (hasRefreshTokensTable) {
      await queryRunner.dropTable('auth_refresh_tokens');
    }

    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) {
      return;
    }

    const hasPasswordHash = await queryRunner.hasColumn(
      'users',
      'password_hash',
    );
    if (hasPasswordHash) {
      await queryRunner.dropColumn('users', 'password_hash');
    }

    const hasGoogleId = await queryRunner.hasColumn('users', 'google_id');
    if (hasGoogleId) {
      await queryRunner.query(
        'UPDATE "users" SET "google_id" = \'local-\' || "id" WHERE "google_id" IS NULL',
      );
      await queryRunner.query(
        'ALTER TABLE "users" ALTER COLUMN "google_id" SET NOT NULL',
      );
    }
  }
}
