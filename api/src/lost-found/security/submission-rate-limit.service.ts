import { Injectable } from '@nestjs/common';

type RateBucket = {
  name: string;
  limit: number;
  windowMs: number;
};

type ConsumeResult = {
  allowed: boolean;
  retryAfterSec: number;
  remainingByBucket: Record<string, number>;
};

@Injectable()
export class SubmissionRateLimitService {
  private readonly store = new Map<string, Map<string, number[]>>();

  consume(key: string, buckets: RateBucket[]): ConsumeResult {
    const now = Date.now();
    const keyState = this.store.get(key) ?? new Map<string, number[]>();
    this.store.set(key, keyState);

    const nextState = new Map<string, number[]>();
    const remainingByBucket: Record<string, number> = {};

    // First pass: validate all buckets without mutating state
    for (const bucket of buckets) {
      const existing = keyState.get(bucket.name) ?? [];
      const active = existing.filter((ts) => ts > now - bucket.windowMs);

      if (active.length >= bucket.limit) {
        const earliest = active[0];
        const retryAfterMs = Math.max(earliest + bucket.windowMs - now, 1000);

        return {
          allowed: false,
          retryAfterSec: Math.ceil(retryAfterMs / 1000),
          remainingByBucket,
        };
      }

      nextState.set(bucket.name, active);
      remainingByBucket[bucket.name] = bucket.limit - (active.length + 1);
    }

    // Second pass: persist accepted event
    for (const bucket of buckets) {
      const active = nextState.get(bucket.name) ?? [];
      active.push(now);
      keyState.set(bucket.name, active);
    }

    return {
      allowed: true,
      retryAfterSec: 0,
      remainingByBucket,
    };
  }
}
