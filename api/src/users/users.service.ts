import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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
}
