import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard to verify user is enrolled in a course before posting a review
 * Note: This is a placeholder implementation. You need to implement
 * course enrollment checking based on your enrollment logic.
 */
@Injectable()
export class EnrollmentVerificationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const courseId = request.params.id;
    if (!courseId) {
      throw new BadRequestException('Course ID is required');
    }

    // TODO: Implement actual enrollment verification
    // This would typically query an enrollment table to verify
    // that the user is enrolled in the course
    // Example:
    // const enrollment = await enrollmentRepository.findOne({
    //   where: {
    //     user: { id: user.id },
    //     course: { id: courseId },
    //   },
    // });
    // if (!enrollment) {
    //   throw new ForbiddenException('You are not enrolled in this course');
    // }

    return true;
  }
}
