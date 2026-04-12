import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthRefreshToken } from '../database/entities/auth-refresh-token.entity';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { LocalAuthService } from './local-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AuthRefreshToken]),
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresInSeconds = Number(
          configService.get<string>('JWT_EXPIRES_IN_SECONDS') ??
            60 * 60 * 24 * 7,
        );

        return {
          secret: configService.get<string>('JWT_SECRET', 'dev-jwt-secret'),
          signOptions: {
            expiresIn: Number.isFinite(expiresInSeconds)
              ? expiresInSeconds
              : 60 * 60 * 24 * 7,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalAuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, LocalAuthService, RolesGuard],
})
export class AuthModule {}
