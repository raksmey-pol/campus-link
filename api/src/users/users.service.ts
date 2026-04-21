import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointType } from '../database/enums';
import { PointTransaction } from '../database/entities/point-transaction.entity';
import { User } from '../database/entities/user.entity';

export type GoogleUserInput = {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
};

export type LocalUserInput = {
  email: string;
  displayName: string;
  passwordHash: string;
};

export type UserPointHistoryEntry = {
  id: number;
  amount: number;
  type: string;
  referenceId: number | null;
  referenceType: string | null;
  createdAt: string;
};

export type UserPointHistory = {
  civicPoints: number;
  transactions: UserPointHistoryEntry[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filter: {
    type: PointType | 'ALL';
  };
};

export type UserPointHistoryQuery = {
  page?: number;
  limit?: number;
  type?: PointType;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionsRepository: Repository<PointTransaction>,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async upsertGoogleUser(input: GoogleUserInput): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: [{ google_id: input.googleId }, { email: input.email }],
    });

    if (existingUser) {
      existingUser.google_id = input.googleId;
      existingUser.email = input.email;
      existingUser.display_name = input.displayName;
      existingUser.avatar_url = input.avatarUrl ?? null;
      return this.usersRepository.save(existingUser);
    }

    const user = this.usersRepository.create({
      google_id: input.googleId,
      email: input.email,
      display_name: input.displayName,
      avatar_url: input.avatarUrl ?? null,
    });

    return this.usersRepository.save(user);
  }

  async createLocalUser(input: LocalUserInput): Promise<User> {
    const user = this.usersRepository.create({
      google_id: null,
      email: input.email,
      display_name: input.displayName,
      password_hash: input.passwordHash,
      avatar_url: null,
    });

    return this.usersRepository.save(user);
  }

  async getPointHistoryForUser(
    userId: number,
    query: UserPointHistoryQuery = {},
  ): Promise<UserPointHistory> {
    const safePage = Number.isFinite(query.page)
      ? Math.max(Math.trunc(query.page ?? 1), 1)
      : 1;
    const safeLimit = Number.isFinite(query.limit)
      ? Math.min(Math.max(Math.trunc(query.limit ?? 20), 1), 50)
      : 20;
    const selectedType = query.type;

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    const civicPoints = user?.civic_points ?? 0;

    const queryBuilder = this.pointTransactionsRepository
      .createQueryBuilder('point_transaction')
      .leftJoin('point_transaction.user', 'user')
      .where('user.id = :userId', { userId });

    if (selectedType) {
      queryBuilder.andWhere('point_transaction.type = :selectedType', {
        selectedType,
      });
    }

    const [transactions, total] = await queryBuilder
      .orderBy('point_transaction.created_at', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));


    return {
      civicPoints,
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        referenceId: transaction.reference_id,
        referenceType: transaction.reference_type,
        createdAt: transaction.created_at.toISOString(),
      })),
      pagination: {
        page: safePage,
        perPage: safeLimit,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      },
      filter: {
        type: selectedType ?? 'ALL',
      },
    };
  }
}
