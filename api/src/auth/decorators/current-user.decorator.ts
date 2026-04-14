import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../database/entities/user.entity';

type RequestWithUser = Request & { user?: User | false };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user && typeof request.user === 'object'
      ? request.user
      : undefined;
  },
);
