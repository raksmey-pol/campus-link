import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { User } from '../../database/entities/user.entity';
import { SubmissionRateLimitService } from '../security/submission-rate-limit.service';

type RequestWithMaybeUser = Request & { user?: User | false };

type RateBucket = {
  name: string;
  limit: number;
  windowMs: number;
};

/**
 * Protects POST /items by throttling on a composite identity:
 * IP + user-agent + guest token (cookie/header) + optional client fingerprint.
 *
 * This reduces abuse while avoiding strict IP-only throttling issues on shared Wi-Fi.
 */
@Injectable()
export class ItemSubmissionRateLimitGuard implements CanActivate {
  private readonly guestBuckets: RateBucket[];

  private readonly authBuckets: RateBucket[];

  constructor(
    private readonly rateLimitService: SubmissionRateLimitService,
    private readonly configService: ConfigService,
  ) {
    this.guestBuckets = [
      {
        name: 'burst',
        limit: this.getPositiveIntFromEnv('ITEMS_SUBMIT_GUEST_BURST_LIMIT', 3),
        windowMs:
          this.getPositiveIntFromEnv(
            'ITEMS_SUBMIT_GUEST_BURST_WINDOW_SEC',
            10 * 60,
          ) * 1000,
      },
      {
        name: 'daily',
        limit: this.getPositiveIntFromEnv('ITEMS_SUBMIT_GUEST_DAILY_LIMIT', 15),
        windowMs:
          this.getPositiveIntFromEnv(
            'ITEMS_SUBMIT_GUEST_DAILY_WINDOW_SEC',
            24 * 60 * 60,
          ) * 1000,
      },
    ];

    this.authBuckets = [
      {
        name: 'burst',
        limit: this.getPositiveIntFromEnv('ITEMS_SUBMIT_AUTH_BURST_LIMIT', 10),
        windowMs:
          this.getPositiveIntFromEnv(
            'ITEMS_SUBMIT_AUTH_BURST_WINDOW_SEC',
            10 * 60,
          ) * 1000,
      },
      {
        name: 'daily',
        limit: this.getPositiveIntFromEnv('ITEMS_SUBMIT_AUTH_DAILY_LIMIT', 120),
        windowMs:
          this.getPositiveIntFromEnv(
            'ITEMS_SUBMIT_AUTH_DAILY_WINDOW_SEC',
            24 * 60 * 60,
          ) * 1000,
      },
    ];
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithMaybeUser>();
    const response = context.switchToHttp().getResponse<Response>();

    const authUser =
      request.user && typeof request.user === 'object'
        ? request.user
        : undefined;

    const clientIp = this.getClientIp(request);
    const userAgent = request.get('user-agent') ?? 'unknown';
    const clientFingerprint = request.get('x-device-fingerprint') ?? 'none';

    const guestToken = this.getOrIssueGuestToken(request, response);
    const compositeRaw = `${clientIp}|${userAgent}|${guestToken}|${clientFingerprint}`;
    const compositeHash = createHash('sha256')
      .update(compositeRaw)
      .digest('hex');

    const actorKey = authUser ? `user:${authUser.id}` : 'guest';
    const rateKey = `items:submit:${actorKey}:${compositeHash}`;
    const buckets = authUser ? this.authBuckets : this.guestBuckets;

    const result = this.rateLimitService.consume(rateKey, buckets);

    response.setHeader(
      'X-RateLimit-Bucket',
      authUser ? 'authenticated' : 'guest',
    );
    response.setHeader(
      'X-RateLimit-Remaining-Burst',
      String(result.remainingByBucket.burst ?? 0),
    );
    response.setHeader(
      'X-RateLimit-Remaining-Daily',
      String(result.remainingByBucket.daily ?? 0),
    );

    if (!result.allowed) {
      response.setHeader('Retry-After', String(result.retryAfterSec));
      throw new HttpException(
        `Too many item submissions. Please retry in ${Math.ceil(result.retryAfterSec / 60)} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0]?.trim() ?? request.ip ?? 'unknown-ip';
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0] ?? request.ip ?? 'unknown-ip';
    }

    return request.ip ?? request.socket.remoteAddress ?? 'unknown-ip';
  }

  private getOrIssueGuestToken(request: Request, response: Response): string {
    const tokenFromHeader = request.get('x-guest-token');
    const tokenFromCookie = this.readCookie(request, 'cl_guest_token');
    const existing = tokenFromHeader || tokenFromCookie;

    if (existing) {
      response.setHeader('X-Guest-Token', existing);
      return existing;
    }

    const issued = randomUUID();

    response.cookie('cl_guest_token', issued, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 90, // 90 days
      path: '/',
    });
    response.setHeader('X-Guest-Token', issued);

    return issued;
  }

  private readCookie(request: Request, name: string): string | undefined {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return undefined;
    }

    for (const part of cookieHeader.split(';')) {
      const [key, ...valueParts] = part.trim().split('=');
      if (key === name) {
        return decodeURIComponent(valueParts.join('='));
      }
    }

    return undefined;
  }

  private getPositiveIntFromEnv(key: string, defaultValue: number): number {
    const raw = this.configService.get<string>(key);
    const parsed = Number.parseInt(raw ?? '', 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return defaultValue;
    }

    return parsed;
  }
}
