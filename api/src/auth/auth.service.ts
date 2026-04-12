import { createHash, randomUUID } from 'crypto';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuth2Client } from 'google-auth-library';
import { Repository } from 'typeorm';
import { AuthRefreshToken } from '../database/entities/auth-refresh-token.entity';
import { User } from '../database/entities/user.entity';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenPayload } from './interfaces/refresh-token-payload.interface';
import { UsersService } from '../users/users.service';

export type AuthUserProfile = {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: User['role'];
  civicPoints: number;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserProfile;
};

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(AuthRefreshToken)
    private readonly refreshTokensRepository: Repository<AuthRefreshToken>,
  ) {}

  async loginWithGoogle(dto: GoogleLoginDto): Promise<AuthResponse> {
    const googleIdentity = await this.verifyGoogleIdToken(dto.idToken);

    const user = await this.usersService.upsertGoogleUser({
      googleId: googleIdentity.googleId,
      email: googleIdentity.email,
      displayName: googleIdentity.displayName,
      avatarUrl: googleIdentity.avatarUrl,
    });

    return this.issueTokensForUser(user);
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(dto.refreshToken, false);

    const session = await this.refreshTokensRepository.findOne({
      where: { token_id: payload.tokenId },
      relations: { user: true },
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revoked_at || session.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    if (session.token_hash !== this.hashToken(dto.refreshToken)) {
      await this.revokeSession(session, 'token_mismatch');
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.revokeSession(session, 'rotated');

    return this.issueTokensForUser(session.user);
  }

  async revokeRefreshToken(
    dto: RefreshTokenDto,
  ): Promise<{ revoked: boolean }> {
    const payload = await this.verifyRefreshToken(dto.refreshToken, true);

    const session = await this.refreshTokensRepository.findOne({
      where: { token_id: payload.tokenId },
    });

    if (!session || session.revoked_at) {
      return { revoked: true };
    }

    if (session.token_hash !== this.hashToken(dto.refreshToken)) {
      await this.revokeSession(session, 'token_mismatch');
      return { revoked: true };
    }

    await this.revokeSession(session, 'manual_logout');

    return { revoked: true };
  }

  async revokeAllRefreshTokensForUser(
    userId: number,
  ): Promise<{ revoked: number }> {
    const result = await this.refreshTokensRepository
      .createQueryBuilder()
      .update(AuthRefreshToken)
      .set({ revoked_at: new Date(), revoke_reason: 'manual_logout_all' })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();

    return { revoked: result.affected ?? 0 };
  }

  async validateUserById(id: number): Promise<User | null> {
    return this.usersService.findById(id);
  }

  getProfile(user: User): AuthUserProfile {
    return this.toAuthProfile(user);
  }

  async issueTokens(user: User): Promise<AuthResponse> {
    return this.issueTokensForUser(user);
  }

  private async issueTokensForUser(user: User): Promise<AuthResponse> {
    const accessPayload = this.buildAccessPayload(user);
    const accessToken = await this.jwtService.signAsync(accessPayload);
    const refreshToken = await this.createRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      user: this.toAuthProfile(user),
    };
  }

  private buildAccessPayload(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenType: 'access',
    };
  }

  private async createRefreshToken(user: User): Promise<string> {
    const tokenId = randomUUID();
    const expiresInSeconds = this.getRefreshExpiresInSeconds();
    const refreshSecret = this.getRefreshTokenSecret();

    const payload: RefreshTokenPayload = {
      sub: user.id,
      tokenId,
      tokenType: 'refresh',
    };

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: expiresInSeconds,
    });

    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        user,
        token_id: tokenId,
        token_hash: this.hashToken(refreshToken),
        expires_at: new Date(Date.now() + expiresInSeconds * 1000),
        revoked_at: null,
        revoke_reason: null,
      }),
    );

    return refreshToken;
  }

  private async verifyGoogleIdToken(idToken: string): Promise<{
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  }> {
    const audience = this.configService.get<string>('GOOGLE_CLIENT_ID');

    if (!audience) {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID is not configured',
      );
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Invalid Google token payload');
    }

    if (payload.email_verified === false) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const fallbackName = payload.email.split('@')[0] ?? 'user';

    return {
      googleId: payload.sub,
      email: payload.email,
      displayName: payload.name ?? fallbackName,
      avatarUrl: payload.picture,
    };
  }

  private async verifyRefreshToken(
    refreshToken: string,
    ignoreExpiration: boolean,
  ): Promise<RefreshTokenPayload> {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.getRefreshTokenSecret(),
          ignoreExpiration,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.tokenType !== 'refresh' || !payload.tokenId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return payload;
  }

  private async revokeSession(
    session: AuthRefreshToken,
    reason: string,
  ): Promise<void> {
    if (session.revoked_at) {
      return;
    }

    session.revoked_at = new Date();
    session.revoke_reason = reason;
    await this.refreshTokensRepository.save(session);
  }

  private getRefreshTokenSecret(): string {
    return this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );
  }

  private getRefreshExpiresInSeconds(): number {
    const value = Number(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS') ??
        60 * 60 * 24 * 30,
    );

    if (Number.isFinite(value) && value > 0) {
      return value;
    }

    return 60 * 60 * 24 * 30;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toAuthProfile(user: User): AuthUserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role,
      civicPoints: user.civic_points,
    };
  }
}
