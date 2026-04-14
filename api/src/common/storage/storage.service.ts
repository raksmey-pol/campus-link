import { Injectable } from '@nestjs/common';

export interface UploadOptions {
  folder: string;
  filename: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
  };
}

export interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export abstract class StorageService {
  abstract upload(
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<UploadResult>;
  abstract delete(publicId: string): Promise<void>;
}
