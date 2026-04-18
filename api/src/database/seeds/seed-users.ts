import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { randomBytes, scryptSync } from 'crypto';
import dataSource from '../data-source';
import { UserRole } from '../enums';
import { User } from '../entities/user.entity';

loadEnv();

type SeedUser = {
  email: string;
  displayName: string;
  role: UserRole;
  password: string;
};

function optionalEnvValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value === '' ? undefined : value;
}

const defaultPassword =
  optionalEnvValue(process.env.SEED_DEFAULT_PASSWORD) ?? 'ChangeMe123!';

const seedUsers: SeedUser[] = [
  {
    email:
      optionalEnvValue(process.env.SEED_ADMIN_EMAIL) ??
      'admin@campuslink.local',
    displayName:
      optionalEnvValue(process.env.SEED_ADMIN_NAME) ?? 'Campus Admin',
    role: UserRole.ADMIN,
    password:
      optionalEnvValue(process.env.SEED_ADMIN_PASSWORD) ?? defaultPassword,
  },
  {
    email:
      optionalEnvValue(process.env.SEED_USER1_EMAIL) ??
      'user1@campuslink.local',
    displayName:
      optionalEnvValue(process.env.SEED_USER1_NAME) ?? 'Campus User One',
    role: UserRole.USER,
    password:
      optionalEnvValue(process.env.SEED_USER1_PASSWORD) ?? defaultPassword,
  },
  {
    email:
      optionalEnvValue(process.env.SEED_USER2_EMAIL) ??
      'user2@campuslink.local',
    displayName:
      optionalEnvValue(process.env.SEED_USER2_NAME) ?? 'Campus User Two',
    role: UserRole.USER,
    password:
      optionalEnvValue(process.env.SEED_USER2_PASSWORD) ?? defaultPassword,
  },
];

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function seedLocalUsers(): Promise<void> {
  await dataSource.initialize();
  const usersRepo = dataSource.getRepository(User);

  let createdCount = 0;
  let updatedCount = 0;

  for (const seedUser of seedUsers) {
    const existing = await usersRepo.findOne({
      where: { email: seedUser.email.toLowerCase() },
    });

    const passwordHash = hashPassword(seedUser.password);

    if (existing) {
      existing.display_name = seedUser.displayName;
      existing.role = seedUser.role;
      existing.password_hash = passwordHash;
      existing.google_id = null;

      await usersRepo.save(existing);
      updatedCount += 1;
      console.log(`[seed-users] Updated ${seedUser.role}: ${seedUser.email}`);
      continue;
    }

    const user = usersRepo.create({
      google_id: null,
      email: seedUser.email.toLowerCase(),
      password_hash: passwordHash,
      display_name: seedUser.displayName,
      avatar_url: null,
      role: seedUser.role,
      telegram_id: null,
      civic_points: 0,
    });

    await usersRepo.save(user);
    createdCount += 1;
    console.log(`[seed-users] Created ${seedUser.role}: ${seedUser.email}`);
  }

  console.log(
    `[seed-users] Done. Created: ${createdCount}, Updated: ${updatedCount}`,
  );
  console.log(
    '[seed-users] Default password is SEED_DEFAULT_PASSWORD (or ChangeMe123! if not set).',
  );
}

void seedLocalUsers()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(`[seed-users] Failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });
