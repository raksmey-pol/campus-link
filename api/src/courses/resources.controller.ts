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
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { StorageService } from '../common/storage/storage.service';

@Controller('courses/:courseId/resources')
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly storageService: StorageService,
  ) {}

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
   * Supports multipart/form-data with optional file upload
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadResource(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateResourceDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User,
  ) {
    // If file is uploaded, store it and get the URL
    let fileUrl: string | undefined;
    if (file) {
      const uploadResult = await this.storageService.upload(file, {
        folder: `resources/course-${courseId}`,
        filename: `${Date.now()}-${file.originalname}`,
      });
      fileUrl = uploadResult.url;
    }

    return this.resourcesService.uploadResource(courseId, user.id, dto, fileUrl);
  }
}

@Controller('resources')
export class ResourceVotesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  /**
   * GET /resources/:id/download
   * Download a resource file
   */
  @Get(':id/download')
  async downloadResource(
    @Param('id', ParseIntPipe) resourceId: number,
    @Res() res: Response,
  ) {
    // Get resource from database
    const resource = await this.resourcesService.getResourceById(resourceId);
    if (!resource || !resource.file_url) {
      throw new NotFoundException('Resource not found or has no file to download');
    }

    try {
      // Construct file path from file_url
      const uploadDir = process.env.LOCAL_UPLOAD_DIR ?? 'uploads';
      const fileUrlPath = resource.file_url
        .replace(/^\/+/, '') // Remove leading slashes
        .replace(new RegExp(`^${uploadDir.replace(/\\/g, '/')}`), '') // Remove upload dir prefix
        .replace(/^\/+/, ''); // Remove leading slashes again
      const filePath = join(process.cwd(), uploadDir, fileUrlPath);
      
      // Check if file exists
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) {
        throw new NotFoundException('File not found');
      }
      
      // Extract original filename or use resource title
      const originalName = resource.file_url.split('/').pop() || `resource-${resourceId}`;
      
      // Set headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', fileStats.size);
      
      // Stream the file
      const stream = createReadStream(filePath);
      stream.pipe(res);
      
      stream.on('error', (error) => {
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error downloading file', error: error.message });
        }
      });
    } catch (error) {
      throw new NotFoundException('File not found or inaccessible');
    }
  }

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
