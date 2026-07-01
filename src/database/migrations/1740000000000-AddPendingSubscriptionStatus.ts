import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingSubscriptionStatus1740000000000
  implements MigrationInterface
{
  name = 'AddPendingSubscriptionStatus1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "subscriptions_status_enum" ADD VALUE IF NOT EXISTS 'pending' BEFORE 'trialing'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values without recreating the type.
  }
}