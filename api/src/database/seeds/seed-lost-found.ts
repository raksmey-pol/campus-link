import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import dataSource from '../data-source';
import { ClaimStatus, ItemStatus, ValueTier } from '../enums';
import { Claim } from '../entities/claim.entity';
import { Item } from '../entities/item.entity';
import { User } from '../entities/user.entity';

loadEnv();

type SeedClaim = {
  claimerEmail: string;
  proofDescription: string;
  status: ClaimStatus;
  rejectionReason?: string;
};

type SeedItem = {
  seedKey: string;
  title: string;
  description: string;
  photoUrl: string;
  valueTier: ValueTier;
  status: ItemStatus;
  location: string;
  reporterEmail?: string;
  resolvedAtIso?: string;
  claims?: SeedClaim[];
};

function optionalEnvValue(value: string | undefined): string | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  return value;
}

const seedAdminEmail =
  optionalEnvValue(process.env.SEED_ADMIN_EMAIL)?.toLowerCase() ??
  'admin@campuslink.local';
const seedUser1Email =
  optionalEnvValue(process.env.SEED_USER1_EMAIL)?.toLowerCase() ??
  'user1@campuslink.local';
const seedUser2Email =
  optionalEnvValue(process.env.SEED_USER2_EMAIL)?.toLowerCase() ??
  'user2@campuslink.local';

const seedItems: SeedItem[] = [
  {
    seedKey: '900000000000001',
    title: 'MacBook Pro 14"',
    description:
      'Space gray MacBook Pro found near the library charging station. Contains no visible stickers.',
    photoUrl: 'https://picsum.photos/id/180/1280/720',
    valueTier: ValueTier.VERY_HIGH,
    status: ItemStatus.APPROVED,
    location: 'Main Library, Level 2',
    reporterEmail: seedUser1Email,
    claims: [
      {
        claimerEmail: seedUser2Email,
        proofDescription:
          'I can provide the lock screen name and serial number prefix.',
        status: ClaimStatus.PENDING,
      },
    ],
  },
  {
    seedKey: '900000000000002',
    title: 'House Keys (Leather Tag)',
    description:
      'A keyring with two keys and a brown leather strap was found beside the student lounge couch.',
    photoUrl: 'https://picsum.photos/id/96/1280/720',
    valueTier: ValueTier.MEDIUM,
    status: ItemStatus.APPROVED,
    location: 'Student Lounge East',
    reporterEmail: seedUser2Email,
    claims: [
      {
        claimerEmail: seedUser1Email,
        proofDescription:
          'The keyring has a hidden silver ring scratch on the back side.',
        status: ClaimStatus.PENDING,
      },
    ],
  },
  {
    seedKey: '900000000000003',
    title: 'Blue Hydro Flask Bottle',
    description:
      'Blue flask with a white campus sticker near the base. Found after evening gym session.',
    photoUrl: 'https://picsum.photos/id/1060/1280/720',
    valueTier: ValueTier.LOW,
    status: ItemStatus.APPROVED,
    location: 'Gym Hallway',
  },
  {
    seedKey: '900000000000004',
    title: 'AirPods Pro (White Case)',
    description:
      'AirPods case found closed under a cafeteria table near the window seats.',
    photoUrl: 'https://picsum.photos/id/403/1280/720',
    valueTier: ValueTier.HIGH,
    status: ItemStatus.APPROVED,
    location: 'Cafeteria Terrace',
    reporterEmail: seedUser1Email,
    claims: [
      {
        claimerEmail: seedUser2Email,
        proofDescription:
          'The right earbud has a tiny dot mark and I can pair to verify.',
        status: ClaimStatus.REJECTED,
        rejectionReason:
          'Proof details did not match finder verification notes.',
      },
    ],
  },
  {
    seedKey: '900000000000005',
    title: 'Physics Notebook',
    description:
      'Black notebook with class formulas on first page and a blue pen clip inside.',
    photoUrl: 'https://picsum.photos/id/20/1280/720',
    valueTier: ValueTier.MEDIUM,
    status: ItemStatus.APPROVED,
    location: 'Building B, Cafeteria Corner',
    reporterEmail: seedUser2Email,
  },
  {
    seedKey: '900000000000006',
    title: 'TI-84 Graphing Calculator',
    description:
      'Calculator with initials on the back cover found in classroom drawer after lecture.',
    photoUrl: 'https://picsum.photos/id/2/1280/720',
    valueTier: ValueTier.HIGH,
    status: ItemStatus.APPROVED,
    location: 'Room 305, Science Block',
  },
  {
    seedKey: '900000000000007',
    title: 'Student ID Card (Kimheng T.)',
    description:
      'ID card found near the vending machine. Pending verification before public listing.',
    photoUrl: 'https://picsum.photos/id/1011/1280/720',
    valueTier: ValueTier.MEDIUM,
    status: ItemStatus.PENDING,
    location: 'Building A, Ground Floor',
    reporterEmail: seedUser1Email,
  },
  {
    seedKey: '900000000000008',
    title: 'Black Leather Wallet',
    description:
      'Wallet with no visible ID in outer pocket. Claimer already matched ownership details.',
    photoUrl: 'https://picsum.photos/id/175/1280/720',
    valueTier: ValueTier.HIGH,
    status: ItemStatus.CLAIMED,
    location: 'Parking Lot B',
    reporterEmail: seedUser2Email,
    claims: [
      {
        claimerEmail: seedUser1Email,
        proofDescription:
          'I can identify the exact card order and wallet fold mark.',
        status: ClaimStatus.APPROVED,
      },
    ],
  },
  {
    seedKey: '900000000000009',
    title: 'Silver Ring with Initials',
    description:
      'Ring was returned successfully after both finder and owner confirmed handoff.',
    photoUrl: 'https://picsum.photos/id/64/1280/720',
    valueTier: ValueTier.MEDIUM,
    status: ItemStatus.RESOLVED,
    location: 'Dorm Lobby Reception',
    resolvedAtIso: '2026-04-18T08:00:00.000Z',
    claims: [
      {
        claimerEmail: seedUser2Email,
        proofDescription: 'The inside engraving contains my initials and date.',
        status: ClaimStatus.APPROVED,
      },
    ],
  },
  {
    seedKey: '900000000000010',
    title: 'USB-C Hub (Damaged Port)',
    description:
      'Submitted report did not meet moderation standards for publishable item details.',
    photoUrl: 'https://picsum.photos/id/160/1280/720',
    valueTier: ValueTier.LOW,
    status: ItemStatus.REJECTED,
    location: 'Engineering Lab Entrance',
  },
];

function getResolveState(status: ItemStatus, resolvedAtIso?: string) {
  if (status === ItemStatus.RESOLVED) {
    return {
      finderConfirmed: true,
      claimerConfirmed: true,
      resolvedAt: resolvedAtIso ? new Date(resolvedAtIso) : new Date(),
    };
  }

  return {
    finderConfirmed: false,
    claimerConfirmed: false,
    resolvedAt: null,
  };
}

async function seedLostFoundItems(): Promise<void> {
  await dataSource.initialize();

  const usersRepo = dataSource.getRepository(User);
  const itemsRepo = dataSource.getRepository(Item);
  const claimsRepo = dataSource.getRepository(Claim);

  const allUsers = await usersRepo.find();
  const userByEmail = new Map(
    allUsers.map((user) => [user.email.toLowerCase(), user]),
  );

  const moderator = userByEmail.get(seedAdminEmail) ?? null;

  let createdItems = 0;
  let updatedItems = 0;
  let createdClaims = 0;
  let updatedClaims = 0;

  for (const seedItem of seedItems) {
    const reporter = seedItem.reporterEmail
      ? (userByEmail.get(seedItem.reporterEmail.toLowerCase()) ?? null)
      : null;

    if (seedItem.reporterEmail && !reporter) {
      console.warn(
        `[seed-lost-found] Reporter not found: ${seedItem.reporterEmail}. Using guest reporter for item: ${seedItem.title}`,
      );
    }

    const resolveState = getResolveState(
      seedItem.status,
      seedItem.resolvedAtIso,
    );
    const moderationUser =
      seedItem.status === ItemStatus.PENDING ? null : moderator;

    const existingItem = await itemsRepo.findOne({
      where: { telegram_message_id: seedItem.seedKey },
    });

    const upsertItem = existingItem ?? itemsRepo.create();
    upsertItem.telegram_message_id = seedItem.seedKey;
    upsertItem.title = seedItem.title;
    upsertItem.description = seedItem.description;
    upsertItem.photo_url = seedItem.photoUrl;
    upsertItem.value_tier = seedItem.valueTier;
    upsertItem.status = seedItem.status;
    upsertItem.location = seedItem.location;
    upsertItem.reporter = reporter;
    upsertItem.moderator = moderationUser;
    upsertItem.finder_confirmed = resolveState.finderConfirmed;
    upsertItem.claimer_confirmed = resolveState.claimerConfirmed;
    upsertItem.resolved_at = resolveState.resolvedAt;

    const savedItem = await itemsRepo.save(upsertItem);

    if (existingItem) {
      updatedItems += 1;
      console.log(`[seed-lost-found] Updated item: ${seedItem.title}`);
    } else {
      createdItems += 1;
      console.log(`[seed-lost-found] Created item: ${seedItem.title}`);
    }

    if (!seedItem.claims || seedItem.claims.length === 0) {
      continue;
    }

    for (const seedClaim of seedItem.claims) {
      const claimer = userByEmail.get(seedClaim.claimerEmail.toLowerCase());

      if (!claimer) {
        console.warn(
          `[seed-lost-found] Claimer not found: ${seedClaim.claimerEmail}. Skipping claim for item: ${seedItem.title}`,
        );
        continue;
      }

      const existingClaim = await claimsRepo
        .createQueryBuilder('claim')
        .leftJoin('claim.item', 'item')
        .leftJoin('claim.claimer', 'claimer')
        .where('item.id = :itemId', { itemId: savedItem.id })
        .andWhere('claimer.id = :claimerId', { claimerId: claimer.id })
        .andWhere('claim.proof_description = :proofDescription', {
          proofDescription: seedClaim.proofDescription,
        })
        .getOne();

      const reviewedAt =
        seedClaim.status === ClaimStatus.PENDING ? null : new Date();

      const upsertClaim = existingClaim ?? claimsRepo.create();
      upsertClaim.item = savedItem;
      upsertClaim.claimer = claimer;
      upsertClaim.proof_description = seedClaim.proofDescription;
      upsertClaim.status = seedClaim.status;
      upsertClaim.moderator = reviewedAt ? moderator : null;
      upsertClaim.reviewed_at = reviewedAt;
      upsertClaim.rejection_reason =
        seedClaim.status === ClaimStatus.REJECTED
          ? (seedClaim.rejectionReason?.trim() ??
            'Claim rejected during seed data generation')
          : null;

      await claimsRepo.save(upsertClaim);

      if (existingClaim) {
        updatedClaims += 1;
      } else {
        createdClaims += 1;
      }
    }
  }

  console.log(
    `[seed-lost-found] Done. Items created: ${createdItems}, items updated: ${updatedItems}, claims created: ${createdClaims}, claims updated: ${updatedClaims}`,
  );
}

void seedLostFoundItems()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(`[seed-lost-found] Failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });
