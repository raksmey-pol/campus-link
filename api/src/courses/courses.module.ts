import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../database/entities/course.entity';
import { CourseReview } from '../database/entities/course-review.entity';
import { ReviewVote } from '../database/entities/review-vote.entity';
import { PointTransaction } from '../database/entities/point-transaction.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { ReviewsController, ReviewVotesController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseReview,
      ReviewVote,
      PointTransaction,
    ]),
    UsersModule,
  ],
  controllers: [CoursesController, ReviewsController, ReviewVotesController],
  providers: [CoursesService, ReviewsService],
  exports: [CoursesService, ReviewsService],
})
export class CoursesModule {}
