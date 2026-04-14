import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { dirname, extname, join } from 'path';
import { randomUUID } from 'crypto';
import {
  StorageService,
  UploadOptions,
  UploadResult,
} from '../storage.service';

@Injectable()
export class LocalStorageProvider extends StorageService {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async upload(
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<UploadResult> {
    const baseDir = this.config.get<string>('LOCAL_UPLOAD_DIR', 'uploads');
    const folder = this.sanitizePathSegment(options.folder);
    const extension =
      extname(file.originalname) || this.extensionFromMime(file.mimetype);
    const filenameBase = options.filename?.trim() || randomUUID();
    const filename = `${this.sanitizePathSegment(filenameBase)}${extension}`;
    const relativePath = join(folder, filename).replace(/\\/g, '/');
    const absolutePath = join(process.cwd(), baseDir, relativePath);

    await fs.mkdir(dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    return {
      url: `/${baseDir.replace(/\\/g, '/')}/${relativePath}`,
      publicId: relativePath,
    };
  }

  async delete(publicId: string): Promise<void> {
    const baseDir = this.config.get<string>('LOCAL_UPLOAD_DIR', 'uploads');
    const safePublicId = publicId.replace(/\\/g, '/').replace(/^\/+/, '');
    const absolutePath = join(process.cwd(), baseDir, safePublicId);

    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private sanitizePathSegment(value: string): string {
    return value
      .trim()
      .replace(/[^a-zA-Z0-9-_/]/g, '-')
      .replace(/\.{2,}/g, '-')
      .replace(/\/+/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/-+/g, '-');
  }

  private extensionFromMime(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '';
    }
  }
}
