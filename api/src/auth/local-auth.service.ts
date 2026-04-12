import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import type { AuthResponse } from './auth.service';
import { AuthService } from './auth.service';
import { LocalLoginDto } from './dto/local-login.dto';
import { LocalRegisterDto } from './dto/local-register.dto';
import { UsersService } from '../users/users.service';

const scrypt = promisify(scryptCallback);

@Injectable()
export class LocalAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  async register(dto: LocalRegisterDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.usersService.createLocalUser({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash,
    });

    return this.authService.issueTokens(user);
  }

  async login(dto: LocalLoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValidPassword = await this.verifyPassword(
      dto.password,
      user.password_hash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.authService.issueTokens(user);
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    storedHash: string,
  ): Promise<boolean> {
    const [salt, hashedPassword] = storedHash.split(':');
    if (!salt || !hashedPassword) {
      return false;
    }

    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const hashedBuffer = Buffer.from(hashedPassword, 'hex');

    if (derivedKey.length !== hashedBuffer.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, hashedBuffer);
  }
}
