import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../database/entities/course.entity';
import { CourseReview } from '../database/entities/course-review.entity';
import { ReviewVote } from '../database/entities/review-vote.entity';
import { CourseResource } from '../database/entities/course-resource.entity';
import { ResourceVote } from '../database/entities/resource-vote.entity';
import { PointTransaction } from '../database/entities/point-transaction.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { ReviewsController, ReviewVotesController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ResourcesController, ResourceVotesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseReview,
      ReviewVote,
      CourseResource,
      ResourceVote,
      PointTransaction,
    ]),
    UsersModule,
  ],
  controllers: [
    CoursesController,
    ReviewsController,
    ReviewVotesController,
    ResourcesController,
    ResourceVotesController,
  ],
  providers: [CoursesService, ReviewsService, ResourcesService],
  exports: [CoursesService, ReviewsService, ResourcesService],
})
export class CoursesModule {}
