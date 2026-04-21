import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../database/entities/course.entity';
import { CourseReview } from '../database/entities/course-review.entity';
import { ReviewVote } from '../database/entities/review-vote.entity';
import { CourseResource } from '../database/entities/course-resource.entity';
import { ResourceVote } from '../database/entities/resource-vote.entity';
import { CourseQuestion } from '../database/entities/course-question.entity';
import { CourseAnswer } from '../database/entities/course-answer.entity';
import { AnswerVote } from '../database/entities/answer-vote.entity';
import { PointTransaction } from '../database/entities/point-transaction.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { ReviewsController, ReviewVotesController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ResourcesController, ResourceVotesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import {
  QuestionsController,
  QuestionDetailController,
  AnswersController,
  AnswerModController,
} from './qa.controller';
import { QAService } from './qa.service';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseReview,
      ReviewVote,
      CourseResource,
      ResourceVote,
      CourseQuestion,
      CourseAnswer,
      AnswerVote,
      PointTransaction,
    ]),
    UsersModule,
    StorageModule,
  ],
  controllers: [
    CoursesController,
    ReviewsController,
    ReviewVotesController,
    ResourcesController,
    ResourceVotesController,
    QuestionsController,
    QuestionDetailController,
    AnswersController,
    AnswerModController,
  ],
  providers: [CoursesService, ReviewsService, ResourcesService, QAService],
  exports: [CoursesService, ReviewsService, ResourcesService, QAService],
})
export class CoursesModule {}
