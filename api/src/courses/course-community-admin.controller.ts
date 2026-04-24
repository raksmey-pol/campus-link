import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ResourceStatus, ResourceType, ReviewStatus } from '../database/enums';
import { ReviewsService } from './reviews.service';
import { ResourcesService } from './resources.service';
import { QAService } from './qa.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
@Controller('admin/course-community')
export class CourseCommunityAdminController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly resourcesService: ResourcesService,
    private readonly qaService: QAService,
  ) {}

  @Get('summary')
  async getSummary() {
    const [reviews, resources, questions] = await Promise.all([
      this.reviewsService.getModerationCounts(),
      this.resourcesService.getModerationCounts(),
      this.qaService.getModerationCounts(),
    ]);

    return {
      reviews,
      resources,
      questions,
      totalPending: reviews.pending + resources.pending,
    };
  }

  @Get('reviews')
  async listReviews(
    @Query('status') status?: ReviewStatus,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
  ) {
    return this.reviewsService.listModerationReviews({ status, search, page });
  }

  @Get('resources')
  async listResources(
    @Query('status') status?: ResourceStatus,
    @Query('type') type?: ResourceType,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
  ) {
    return this.resourcesService.listModerationResources({
      status,
      type,
      search,
      page,
    });
  }

  @Get('questions')
  async listQuestions(
    @Query('state') state?: 'ALL' | 'OPEN' | 'PINNED' | 'CLOSED',
    @Query('search') search?: string,
    @Query('courseId', new ParseIntPipe({ optional: true })) courseId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
  ) {
    return this.qaService.listModerationQuestions({
      state,
      search,
      courseId,
      page,
    });
  }

  @Get('questions/:id')
  async getQuestionDetail(@Param('id', ParseIntPipe) id: number) {
    return this.qaService.getModerationQuestionDetail(id);
  }
}
