import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { VoteReviewDto } from './dto/vote-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';
import { EnrollmentVerificationGuard } from './guards/enrollment-verification.guard';
import { ReviewModeratorGuard } from './guards/review-moderator.guard';

@Controller('courses/:id/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * GET /courses/:id/reviews
   * List approved reviews for a course
   * Query params: sort (helpful|recent), page (1-based)
   */
  @Get()
  async listReviews(
    @Param('id', ParseIntPipe) courseId: number,
    @Query('sort') sort: 'helpful' | 'recent' = 'recent',
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
  ) {
    return this.reviewsService.getReviewsByCourse(courseId, sort, page);
  }

  /**
   * POST /courses/:id/reviews
   * Submit a new review (requires auth + enrollment verification)
   */
  @UseGuards(JwtAuthGuard, EnrollmentVerificationGuard)
  @Post()
  async createReview(
    @Param('id', ParseIntPipe) courseId: number,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: User,
  ) {
    return this.reviewsService.createReview(courseId, user.id, dto);
  }
}

@Controller('reviews')
export class ReviewVotesController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * POST /reviews/:id/vote
   * Upvote or downvote helpfulness of a review
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/vote')
  async voteReview(
    @Param('id', ParseIntPipe) reviewId: number,
    @Body() dto: VoteReviewDto,
    @CurrentUser() user: User,
  ) {
    return this.reviewsService.voteReview(reviewId, user.id, dto);
  }

  /**
   * PATCH /reviews/:id/status
   * Mod — approve or reject review; on approve: recalculate course aggregates + award points
   */
  @UseGuards(JwtAuthGuard, RolesGuard, ReviewModeratorGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Patch(':id/status')
  async updateReviewStatus(
    @Param('id', ParseIntPipe) reviewId: number,
    @Body() dto: UpdateReviewStatusDto,
  ) {
    return this.reviewsService.updateReviewStatus(reviewId, dto);
  }

  /**
   * DELETE /reviews/:id
   * Mod/Admin — remove review
   */
  @UseGuards(JwtAuthGuard, RolesGuard, ReviewModeratorGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Delete(':id')
  async deleteReview(@Param('id', ParseIntPipe) reviewId: number) {
    await this.reviewsService.deleteReview(reviewId);
    return { message: 'Review deleted successfully' };
  }
}
