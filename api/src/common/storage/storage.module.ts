import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { LocalStorageProvider } from './providers/local.provider';
import { S3StorageProvider } from './providers/s3.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageService => {
        const driver = config
          .get<string>('STORAGE_DRIVER', 'local')
          .toLowerCase();

        if (driver === 's3') {
          return new S3StorageProvider(config);
        }

        return new LocalStorageProvider(config);
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
