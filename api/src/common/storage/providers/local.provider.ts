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
    const mimeMap: Record<string, string> = {
      // Images
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
      // Documents
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'text/plain': '.txt',
      'text/csv': '.csv',
      'application/json': '.json',
      'application/zip': '.zip',
      'application/x-rar-compressed': '.rar',
      'application/x-7z-compressed': '.7z',
      // Archives
      'application/gzip': '.gz',
      'application/x-tar': '.tar',
      // Media
      'video/mp4': '.mp4',
      'video/mpeg': '.mpeg',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
    };

    return mimeMap[mimeType] || '';
  }
}
