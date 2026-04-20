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
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceStatusDto } from './dto/update-resource-status.dto';
import { VoteResourceDto } from './dto/vote-resource.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../database/entities/user.entity';
import { UserRole, ResourceType } from '../database/enums';

@Controller('courses/:courseId/resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  /**
   * GET /courses/:courseId/resources
   * List approved resources for a course
   * Query params: type (NOTES|PAST_ASSESSMENT|EXTERNAL_LINK|PROJECT_EXAMPLE), page (1-based)
   */
  @Get()
  async listResources(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query('type') type?: ResourceType,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
  ) {
    return this.resourcesService.getApprovedResourcesByCourse(courseId, type, page);
  }

  /**
   * POST /courses/:courseId/resources
   * Upload a new resource (enters moderation queue)
   * Requires: authentication
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async uploadResource(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateResourceDto,
    @CurrentUser() user: User,
  ) {
    // TODO: Implement file upload with multer middleware
    // For now, only link_url resources are supported
    return this.resourcesService.uploadResource(courseId, user.id, dto);
  }
}

@Controller('resources')
export class ResourceVotesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  /**
   * POST /resources/:id/vote
   * Upvote or downvote a resource
   * Requires: authentication
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/vote')
  async voteResource(
    @Param('id', ParseIntPipe) resourceId: number,
    @Body() dto: VoteResourceDto,
    @CurrentUser() user: User,
  ) {
    return this.resourcesService.voteResource(resourceId, user.id, dto);
  }

  /**
   * PATCH /resources/:id/status
   * Mod — approve or reject resource; on approve: award Civic Points to contributor
   * Requires: moderator or admin role
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Patch(':id/status')
  async updateResourceStatus(
    @Param('id', ParseIntPipe) resourceId: number,
    @Body() dto: UpdateResourceStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.resourcesService.updateResourceStatus(
      resourceId,
      user.id,
      dto,
    );
  }

  /**
   * DELETE /resources/:id
   * Mod/Admin — remove a resource
   * Requires: moderator or admin role
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Delete(':id')
  async deleteResource(@Param('id', ParseIntPipe) resourceId: number) {
    await this.resourcesService.deleteResource(resourceId);
    return { message: 'Resource deleted successfully' };
  }
}
