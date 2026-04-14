import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './common/storage/storage.module';
import { LostFoundModule } from './lost-found/lost-found.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASS', 'postgres'),
        database: config.get<string>('DB_NAME', 'campuslink'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun:
          config.get<string>('DB_MIGRATIONS_RUN', 'false') === 'true',
        synchronize: config.get<string>('DB_SYNC', 'false') === 'true',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    StorageModule,
    AuthModule,
    LostFoundModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
