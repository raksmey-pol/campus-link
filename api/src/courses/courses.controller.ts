import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UserRole } from '../database/enums';
import { User } from '../database/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ======================== Public Endpoints ========================

  @Get()
  async listCourses(
    @Query('q') query?: string,
    @Query('dept') department?: string,
    @Query('sort') sort?: string,
    @Query('page') page: number = 1,
  ) {
    return this.coursesService.listCourses({ query, department, sort, page });
  }

  @Get(':id')
  async getCourseDetail(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.findOne(id);
  }

  // ======================== Admin Endpoints ========================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async createCourse(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.createCourse(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async updateCourse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.updateCourse(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteCourse(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.deleteCourse(id);
    return { message: 'Course deleted successfully' };
  }
}