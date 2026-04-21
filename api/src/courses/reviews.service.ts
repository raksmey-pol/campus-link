import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseReview } from '../database/entities/course-review.entity';
import { ReviewVote } from '../database/entities/review-vote.entity';
import { PointTransaction } from '../database/entities/point-transaction.entity';
import { Course } from '../database/entities/course.entity';
import { User } from '../database/entities/user.entity';
import { ReviewStatus, PointType } from '../database/enums';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { VoteReviewDto } from './dto/vote-review.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(CourseReview)
    private readonly reviewRepository: Repository<CourseReview>,
    @InjectRepository(ReviewVote)
    private readonly reviewVoteRepository: Repository<ReviewVote>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get approved reviews for a course, sorted by helpful/recent
   */
  async getReviewsByCourse(
    courseId: number,
    sort: 'helpful' | 'recent' = 'recent',
    page: number = 1,
  ) {
    const take = 10;
    const skip = (page - 1) * take;

    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .where('review.course_id = :courseId', { courseId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .leftJoinAndSelect('review.user', 'user');

    if (sort === 'helpful') {
      qb.orderBy('review.helpfulness_votes', 'DESC').addOrderBy(
        'review.created_at',
        'DESC',
      );
    } else {
      qb.orderBy('review.created_at', 'DESC');
    }

    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    // Strip sensitive user data if anonymous
    const reviews = data.map((review) => ({
      ...review,
      user: review.is_anonymous
        ? { id: null, display_name: 'Anonymous' }
        : {
            id: review.user.id,
            display_name: review.user.display_name,
          },
    }));

    return {
      data: reviews,
      total,
      page,
    };
  }

  /**
   * Create a new review for a course
   */
  async createReview(
    courseId: number,
    userId: number,
    dto: CreateReviewDto,
  ): Promise<CourseReview> {
    // Verify course exists
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }

    // Check for existing review (one per user per course)
    const existingReview = await this.reviewRepository.findOne({
      where: { course: { id: courseId }, user: { id: userId } },
    });

    if (existingReview) {
      throw new BadRequestException(
        'You can only submit one review per course',
      );
    }

    const review = this.reviewRepository.create({
      course: { id: courseId },
      user: { id: userId },
      difficulty: dto.difficulty,
      workload_hours: dto.workload_hours,
      quality: dto.quality,
      usefulness: dto.usefulness,
      recommendation: dto.recommendation,
      review_text: dto.review_text || null,
      is_anonymous: dto.is_anonymous ?? false,
      status: ReviewStatus.PENDING,
      helpfulness_votes: 0,
    });

    return this.reviewRepository.save(review);
  }

  /**
   * Vote on review helpfulness (upvote/downvote)
   */
  async voteReview(
    reviewId: number,
    userId: number,
    dto: VoteReviewDto,
  ): Promise<ReviewVote> {
    // Verify review exists
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException(`Review with id ${reviewId} not found`);
    }

    // Check for existing vote
    const existingVote = await this.reviewVoteRepository.findOne({
      where: { review: { id: reviewId }, user: { id: userId } },
    });

    // If voting the same way again, remove the vote (unvote)
    if (existingVote && existingVote.is_helpful === dto.is_helpful) {
      console.log(
        `[ReviewsService] User ${userId} unvoting review ${reviewId} (was ${dto.is_helpful})`,
      );

      // Delete the vote
      await this.reviewVoteRepository.remove(existingVote);

      // Only helpful votes affect the count
      if (dto.is_helpful) {
        review.helpfulness_votes = Math.max(0, review.helpfulness_votes - 1);
      }

      await this.reviewRepository.save(review);

      return existingVote;
    }

    // If changing vote type
    if (existingVote && existingVote.is_helpful !== dto.is_helpful) {
      console.log(
        `[ReviewsService] User ${userId} changing vote on review ${reviewId} from ${existingVote.is_helpful} to ${dto.is_helpful}`,
      );

      // Only helpful votes affect the count, so only adjust if changing to/from helpful
      if (existingVote.is_helpful && !dto.is_helpful) {
        // Was helpful, now unhelpful → decrement count
        review.helpfulness_votes = Math.max(0, review.helpfulness_votes - 1);
      } else if (!existingVote.is_helpful && dto.is_helpful) {
        // Was unhelpful, now helpful → increment count
        review.helpfulness_votes += 1;
      }

      // Update vote type
      existingVote.is_helpful = dto.is_helpful;
      const updatedVote = await this.reviewVoteRepository.save(existingVote);

      await this.reviewRepository.save(review);

      return updatedVote;
    }

    // Create new vote (no existing vote)
    console.log(
      `[ReviewsService] User ${userId} voting on review ${reviewId} as helpful=${dto.is_helpful}`,
    );

    const vote = this.reviewVoteRepository.create({
      review: { id: reviewId },
      user: { id: userId },
      is_helpful: dto.is_helpful,
    });

    const savedVote = await this.reviewVoteRepository.save(vote);

    // Only helpful votes affect the count
    if (dto.is_helpful) {
      review.helpfulness_votes += 1;
    }

    await this.reviewRepository.save(review);

    return savedVote;
  }

  /**
   * Remove user's vote from a review (unvote)
   */
  async unvoteReview(
    reviewId: number,
    userId: number,
  ): Promise<{ message: string }> {
    // Verify review exists
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException(`Review with id ${reviewId} not found`);
    }

    // Find existing vote
    const existingVote = await this.reviewVoteRepository.findOne({
      where: { review: { id: reviewId }, user: { id: userId } },
    });

    if (!existingVote) {
      throw new BadRequestException(
        'You have not voted on this review',
      );
    }

    // Delete the vote
    await this.reviewVoteRepository.remove(existingVote);

    // Update review helpfulness count
    if (existingVote.is_helpful) {
      review.helpfulness_votes = Math.max(0, review.helpfulness_votes - 1);
    } else {
      review.helpfulness_votes += 1;
    }

    await this.reviewRepository.save(review);

    return { message: 'Vote removed successfully' };
  }

  /**
   * Update review status (approve/reject) — mod only
   */
  async updateReviewStatus(
    reviewId: number,
    dto: UpdateReviewStatusDto,
  ): Promise<CourseReview> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['course', 'user'],
    });

    if (!review) {
      throw new NotFoundException(`Review with id ${reviewId} not found`);
    }

    const previousStatus = review.status;
    console.log('[ReviewsService] updateReviewStatus: review', reviewId, 'previousStatus:', previousStatus, 'newStatus:', dto.status);
    
    review.status = dto.status;

    // Save the review status change FIRST
    const savedReview = await this.reviewRepository.save(review);
    console.log('[ReviewsService] Review saved with status:', savedReview.status);

    // If approving, recalculate course aggregates and award civic points
    if (
      dto.status === ReviewStatus.APPROVED &&
      previousStatus !== ReviewStatus.APPROVED
    ) {
      console.log('[ReviewsService] Recalculating aggregates for course', review.course.id);
      await this.recalculateCourseAggregates(review.course.id);

      // Award civic points to reviewer
      await this.awardCivicPoints(
        review.user.id,
        5, // Points awarded for approved review
        PointType.REVIEW_HELPFUL,
        reviewId,
        'review',
      );
    }

    // If rejecting from approved, recalculate aggregates
    if (
      dto.status === ReviewStatus.REJECTED &&
      previousStatus === ReviewStatus.APPROVED
    ) {
      console.log('[ReviewsService] Recalculating aggregates for course', review.course.id);
      await this.recalculateCourseAggregates(review.course.id);
    }

    return savedReview;
  }

  /**
   * Delete a review — mod/admin only
   */
  async deleteReview(reviewId: number): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['course'],
    });

    if (!review) {
      throw new NotFoundException(`Review with id ${reviewId} not found`);
    }

    const courseId = review.course.id;
    const wasApproved = review.status === ReviewStatus.APPROVED;

    // Delete the review
    await this.reviewRepository.remove(review);

    // Then recalculate aggregates if review was approved
    // This ensures the deleted review is not counted
    if (wasApproved) {
      await this.recalculateCourseAggregates(courseId);
    }
  }

  /**
   * Recalculate course aggregate scores from approved reviews
   */
  private async recalculateCourseAggregates(courseId: number): Promise<void> {
    // Use raw query to ensure proper numeric type handling from PostgreSQL
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .where('review.course_id = :courseId', { courseId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .select('COUNT(*)', 'count')
      .addSelect('AVG(CAST(review.difficulty AS FLOAT))', 'avgDifficulty')
      .addSelect('AVG(CAST(review.workload_hours AS FLOAT))', 'avgWorkload')
      .addSelect('AVG(CAST(review.quality AS FLOAT))', 'avgQuality')
      .addSelect('AVG(CAST(review.usefulness AS FLOAT))', 'avgUsefulness')
      .addSelect('AVG(CAST(review.recommendation AS FLOAT))', 'avgRecommendation')
      .getRawOne();

    console.log('[ReviewsService] Raw SQL result for course', courseId, result);

    const count = parseInt(result?.count || '0', 10);

    if (count === 0) {
      console.log('[ReviewsService] No approved reviews, resetting aggregates for course', courseId);
      // Reset aggregates
      const updateResult = await this.courseRepository.update(
        { id: courseId },
        {
          avg_difficulty: 0,
          avg_workload: 0,
          avg_quality: 0,
          avg_usefulness: 0,
          avg_recommendation: 0,
          review_count: 0,
        },
      );
      console.log('[ReviewsService] Reset update result:', updateResult);
      return;
    }

    const avgDifficulty = parseFloat(result?.avgDifficulty || '0');
    const avgWorkload = parseFloat(result?.avgWorkload || '0');
    const avgQuality = parseFloat(result?.avgQuality || '0');
    const avgUsefulness = parseFloat(result?.avgUsefulness || '0');
    const avgRecommendation = parseFloat(result?.avgRecommendation || '0');

    console.log('[ReviewsService] Calculated averages for course', courseId, {
      count,
      avgDifficulty,
      avgWorkload,
      avgQuality,
      avgUsefulness,
      avgRecommendation,
    });

    const updateResult = await this.courseRepository.update(
      { id: courseId },
      {
        avg_difficulty: Math.round(avgDifficulty * 100) / 100,
        avg_workload: Math.round(avgWorkload * 10) / 10,
        avg_quality: Math.round(avgQuality * 100) / 100,
        avg_usefulness: Math.round(avgUsefulness * 100) / 100,
        avg_recommendation: Math.round(avgRecommendation * 100) / 100,
        review_count: count,
      },
    );

    console.log('[ReviewsService] Update result:', updateResult);

    // Verify the update by fetching the course
    const updatedCourse = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    console.log('[ReviewsService] Updated course data:', updatedCourse);
  }

  /**
   * Award civic points for review approval
   */
  private async awardCivicPoints(
    userId: number,
    amount: number,
    type: PointType,
    referenceId: number,
    referenceType: string,
  ): Promise<PointTransaction> {
    // Get user and verify exists
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Create point transaction
    const transaction = this.pointTransactionRepository.create({
      user: { id: userId },
      amount,
      type,
      reference_id: referenceId,
      reference_type: referenceType,
    });

    await this.pointTransactionRepository.save(transaction);

    // Update user's cumulative civic points
    user.civic_points += amount;
    await this.updateUserCivicPoints(userId, user.civic_points);

    return transaction;
  }

  /**
   * Helper: Update user civic points
   */
  private async updateUserCivicPoints(
    userId: number,
    points: number,
  ): Promise<void> {
    const dataSource = this.reviewRepository.manager.connection;
    await dataSource.query(
      'UPDATE users SET civic_points = $1 WHERE id = $2',
      [points, userId],
    );
  }

  /**
   * TEST ONLY: Public method to test recalculate course aggregates
   */
  async testRecalculateCourseAggregates(courseId: number) {
    console.log('[ReviewsService] TEST: Manually recalculating course', courseId);
    await this.recalculateCourseAggregates(courseId);
    
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }
    
    console.log('[ReviewsService] TEST: Final course data:', {
      id: course.id,
      avg_difficulty: course.avg_difficulty,
      avg_workload: course.avg_workload,
      avg_quality: course.avg_quality,
      avg_usefulness: course.avg_usefulness,
      avg_recommendation: course.avg_recommendation,
      review_count: course.review_count,
    });
    
    return {
      success: true,
      course: {
        id: course.id,
        avg_difficulty: course.avg_difficulty,
        avg_workload: course.avg_workload,
        avg_quality: course.avg_quality,
        avg_usefulness: course.avg_usefulness,
        avg_recommendation: course.avg_recommendation,
        review_count: course.review_count,
      },
    };
  }
}
