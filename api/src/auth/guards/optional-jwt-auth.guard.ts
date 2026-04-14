import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Same as JwtAuthGuard but never throws — returns undefined for
 * absent or invalid tokens instead of 401. Used on public endpoints
 * that render differently for authenticated vs anonymous callers.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T = unknown>(
    _err: unknown,
    user: T | false | null | undefined,
  ): T | undefined {
    // Passport returns `false` when auth is missing/invalid. Convert it to
    // undefined so callers can safely coalesce to null for optional relations.
    if (!user) {
      return undefined;
    }

    return user;
  }

  // canActivate resolves the user but never blocks the request
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
