import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
  StorageService,
  UploadOptions,
  UploadResult,
} from '../storage.service';

@Injectable()
export class S3StorageProvider extends StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    super();

    this.bucket = this.config.get<string>('AWS_S3_BUCKET', '');

    this.s3 = new S3Client({
      region: this.config.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async upload(
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<UploadResult> {
    const { folder, filename } = options;
    const key = `luychlat/${folder}/${filename}`;
    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Public read — so files are accessible via URL
      ACL: 'public-read',
    };

    const upload = new Upload({
      client: this.s3,
      params,
    });

    await upload.done();

    const url = `https://${this.bucket}.s3.${this.config.get('AWS_REGION')}.amazonaws.com/${key}`;

    return { url, publicId: key };
  }

  async delete(publicId: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: publicId,
      }),
    );
  }
}
