import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../database/entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

interface ListCoursesParams {
  query?: string;
  department?: string;
  sort?: string;
  page: number;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async listCourses({ query, department, sort, page }: ListCoursesParams) {
    const take = 10;
    const skip = (page - 1) * take;

    const qb = this.courseRepository.createQueryBuilder('course');

    if (query) {
      qb.andWhere('course.title ILIKE :query OR course.description ILIKE :query', {
        query: `%${query}%`,
      });
    }

    if (department) {
      qb.andWhere('course.department = :department', { department });
    }

    if (sort) {
      const [field, order] = sort.split(':');
      qb.orderBy(`course.${field}`, order.toUpperCase() as 'ASC' | 'DESC');
    }

    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      pageCount: Math.ceil(total / take),
    };
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async createCourse(dto: CreateCourseDto): Promise<Course> {
    const existingCourse = await this.courseRepository.findOne({
      where: { code: dto.code },
    });

    if (existingCourse) {
      throw new BadRequestException(`Course with code "${dto.code}" already exists`);
    }

    const course = this.courseRepository.create({
      code: dto.code,
      title: dto.title,
      credits: dto.credits,
      department: dto.department,
      prerequisites: dto.prerequisites ?? null,
      description: dto.description ?? null,
    });

    return this.courseRepository.save(course);
  }

  async updateCourse(id: number, dto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);

    if (dto.title !== undefined) {
      course.title = dto.title;
    }
    if (dto.credits !== undefined) {
      course.credits = dto.credits;
    }
    if (dto.department !== undefined) {
      course.department = dto.department;
    }
    if (dto.prerequisites !== undefined) {
      course.prerequisites = dto.prerequisites;
    }
    if (dto.description !== undefined) {
      course.description = dto.description;
    }

    return this.courseRepository.save(course);
  }

  async deleteCourse(id: number): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
  }
}