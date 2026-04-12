import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../database/enums';
import { User } from '../database/entities/user.entity';
import type { AuthResponse, AuthUserProfile } from './auth.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LocalLoginDto } from './dto/local-login.dto';
import { LocalRegisterDto } from './dto/local-register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { LocalAuthService } from './local-auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly localAuthService: LocalAuthService,
  ) {}

  @Post('register')
  async registerLocal(@Body() dto: LocalRegisterDto): Promise<AuthResponse> {
    return this.localAuthService.register(dto);
  }

  @Post('login')
  async loginLocal(@Body() dto: LocalLoginDto): Promise<AuthResponse> {
    return this.localAuthService.login(dto);
  }

  @Post('google')
  async loginWithGoogle(@Body() dto: GoogleLoginDto): Promise<AuthResponse> {
    return this.authService.loginWithGoogle(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponse> {
    return this.authService.refreshTokens(dto);
  }

  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto): Promise<{ revoked: boolean }> {
    return this.authService.revokeRefreshToken(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: User): Promise<{ revoked: number }> {
    return this.authService.revokeAllRefreshTokensForUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: User): AuthUserProfile {
    return this.authService.getProfile(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('moderation/ping')
  moderationPing(@CurrentUser() user: User): { allowed: true; role: UserRole } {
    return { allowed: true, role: user.role };
  }
}
