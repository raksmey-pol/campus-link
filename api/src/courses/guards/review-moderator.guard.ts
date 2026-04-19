import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../../database/enums';

/**
 * Guard to verify user is moderator or admin
 */
@Injectable()
export class ReviewModeratorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const isAuthorized =
      user.role === UserRole.MODERATOR || user.role === UserRole.ADMIN;

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Only moderators and admins can perform this action',
      );
    }

    return true;
  }
}
