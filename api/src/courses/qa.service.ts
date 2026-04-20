import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseQuestion } from '../database/entities/course-question.entity';
import { CourseAnswer } from '../database/entities/course-answer.entity';
import { AnswerVote } from '../database/entities/answer-vote.entity';
import { Course } from '../database/entities/course.entity';
import { User } from '../database/entities/user.entity';
import { UserRole, PointType, VoteType } from '../database/enums';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { AcceptAnswerDto } from './dto/accept-answer.dto';
import { VoteAnswerDto } from './dto/vote-answer.dto';
import { PinQuestionDto } from './dto/pin-question.dto';
import { UsersService } from '../users/users.service';

type SortOption = 'recent' | 'most_viewed' | 'unanswered';

@Injectable()
export class QAService {
  constructor(
    @InjectRepository(CourseQuestion)
    private readonly questionRepository: Repository<CourseQuestion>,
    @InjectRepository(CourseAnswer)
    private readonly answerRepository: Repository<CourseAnswer>,
    @InjectRepository(AnswerVote)
    private readonly answerVoteRepository: Repository<AnswerVote>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get questions for a course with sorting options
   */
  async getQuestionsByCourse(
    courseId: number,
    sort: SortOption = 'recent',
    page: number = 1,
  ) {
    const take = 10;
    const skip = (page - 1) * take;

    // Verify course exists
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }

    const qb = this.questionRepository
      .createQueryBuilder('question')
      .where('question.course_id = :courseId', { courseId })
      .where('question.is_closed = :isClosed', { isClosed: false })
      .leftJoinAndSelect('question.user', 'user');

    // Apply sorting
    if (sort === 'most_viewed') {
      qb.orderBy('question.view_count', 'DESC');
    } else if (sort === 'unanswered') {
      qb.andWhere('question.answer_count = 0')
        .orderBy('question.created_at', 'DESC');
    } else {
      // 'recent' is default
      qb.orderBy('question.is_pinned', 'DESC')
        .addOrderBy('question.created_at', 'DESC');
    }

    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((q) => this.sanitizeQuestion(q)),
      total,
      page,
    };
  }

  /**
   * Get question detail with all answers
   */
  async getQuestionDetail(questionId: number) {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['user', 'course'],
    });

    if (!question) {
      throw new NotFoundException(`Question with id ${questionId} not found`);
    }

    // Increment view count
    question.view_count += 1;
    await this.questionRepository.save(question);

    // Get all answers with vote counts
    const answers = await this.answerRepository.find({
      where: { question: { id: questionId } },
      relations: ['user'],
      order: {
        is_accepted: 'DESC', // Accepted answer first
        upvotes: 'DESC',
        created_at: 'DESC',
      },
    });

    return {
      ...this.sanitizeQuestion(question),
      answers: answers.map((a) => this.sanitizeAnswer(a)),
    };
  }

  /**
   * Create a new question
   */
  async createQuestion(
    courseId: number,
    userId: number,
    dto: CreateQuestionDto,
  ): Promise<CourseQuestion> {
    // Verify course exists
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }

    const question = this.questionRepository.create({
      course: { id: courseId },
      user: { id: userId },
      title: dto.title,
      body: dto.body,
      view_count: 0,
      answer_count: 0,
      is_pinned: false,
      is_closed: false,
    });

    return this.questionRepository.save(question);
  }

  /**
   * Post an answer to a question
   */
  async createAnswer(
    questionId: number,
    userId: number,
    dto: CreateAnswerDto,
  ): Promise<CourseAnswer> {
    // Verify question exists
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException(`Question with id ${questionId} not found`);
    }

    // Check if question is closed
    if (question.is_closed) {
      throw new BadRequestException('This question is closed for new answers');
    }

    const answer = this.answerRepository.create({
      question: { id: questionId },
      user: { id: userId },
      body: dto.body,
      upvotes: 0,
      is_accepted: false,
    });

    const savedAnswer = await this.answerRepository.save(answer);

    // Increment answer count
    question.answer_count += 1;
    await this.questionRepository.save(question);

    return savedAnswer;
  }

  /**
   * Accept an answer (question author only)
   */
  async acceptAnswer(
    questionId: number,
    answerId: number,
    userId: number,
    dto: AcceptAnswerDto,
  ): Promise<CourseAnswer> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['user'],  // ← Add this
    });

    if (!question) {
      throw new NotFoundException(`Question with id ${questionId} not found`);
    }

    // Only question author can accept answers
    if (question.user.id !== userId) {
      throw new ForbiddenException(
        'Only the question author can accept answers',
      );
    }

    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
      relations: ['user', 'question'],
    });

    if (!answer) {
      throw new NotFoundException(`Answer with id ${answerId} not found`);
    }

    // Verify answer belongs to this question
    if (answer.question.id !== questionId) {
      throw new BadRequestException(
        'Answer does not belong to this question',
      );
    }

    const previousAccepted = answer.is_accepted;
    answer.is_accepted = dto.is_accepted;

    const savedAnswer = await this.answerRepository.save(answer);

    // Award points if accepting an answer
    if (dto.is_accepted && !previousAccepted) {
      await this.awardCivicPoints(
        answer.user.id,
        15, // Points for accepted answer
        PointType.QA_UPVOTE,
        answerId,
        'answer',
      );
    }

    return savedAnswer;
  }

  /**
   * Vote on an answer (upvote or downvote, with ability to change or remove vote)
   */
  async voteAnswer(
    answerId: number,
    userId: number,
    dto: VoteAnswerDto,
  ): Promise<AnswerVote> {
    // Verify answer exists
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
    });

    if (!answer) {
      throw new NotFoundException(`Answer with id ${answerId} not found`);
    }

    // Check for existing vote
    const existingVote = await this.answerVoteRepository.findOne({
      where: { answer: { id: answerId }, user: { id: userId } },
    });

    // If user is voting the same way, remove the vote
    if (existingVote && existingVote.vote_type === dto.vote_type) {
      // Remove the vote
      await this.answerVoteRepository.remove(existingVote);

      // Update answer vote counts
      if (existingVote.vote_type === VoteType.UPVOTE) {
        answer.upvotes = Math.max(0, answer.upvotes - 1);
      } else {
        answer.downvotes = Math.max(0, answer.downvotes - 1);
      }
      await this.answerRepository.save(answer);

      return existingVote;
    }

    // If user has a different vote, update it
    if (existingVote) {
      // Revert old vote
      if (existingVote.vote_type === VoteType.UPVOTE) {
        answer.upvotes = Math.max(0, answer.upvotes - 1);
      } else {
        answer.downvotes = Math.max(0, answer.downvotes - 1);
      }

      // Apply new vote
      existingVote.vote_type = dto.vote_type;
      if (dto.vote_type === VoteType.UPVOTE) {
        answer.upvotes += 1;
      } else {
        answer.downvotes += 1;
      }

      const updatedVote = await this.answerVoteRepository.save(existingVote);
      await this.answerRepository.save(answer);
      return updatedVote;
    }

    // Create new vote
    const vote = this.answerVoteRepository.create({
      answer: { id: answerId },
      user: { id: userId },
      vote_type: dto.vote_type,
    });

    const savedVote = await this.answerVoteRepository.save(vote);

    // Update answer vote counts
    if (dto.vote_type === VoteType.UPVOTE) {
      answer.upvotes += 1;
    } else {
      answer.downvotes += 1;
    }
    await this.answerRepository.save(answer);

    return savedVote;
  }

  /**
   * Pin/unpin a question (mod only)
   */
  async pinQuestion(
    questionId: number,
    moderatorId: number,
    dto: PinQuestionDto,
  ): Promise<CourseQuestion> {
    // Verify moderator has permission (checked in guard)
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question with id ${questionId} not found`);
    }

    question.is_pinned = dto.is_pinned;
    return this.questionRepository.save(question);
  }

  /**
   * Delete a question (mod/admin only)
   */
  async deleteQuestion(questionId: number): Promise<void> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question with id ${questionId} not found`);
    }

    // Delete all answers related to this question
    await this.answerRepository.delete({ question: { id: questionId } });

    // Delete question
    await this.questionRepository.remove(question);
  }

  /**
   * Delete an answer (mod/admin only)
   */
  async deleteAnswer(answerId: number): Promise<void> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
      relations: ['question'],
    });

    if (!answer) {
      throw new NotFoundException(`Answer with id ${answerId} not found`);
    }

    // Delete related votes
    await this.answerVoteRepository.delete({ answer: { id: answerId } });

    // Decrement question answer count
    if (answer.question) {
      answer.question.answer_count = Math.max(0, answer.question.answer_count - 1);
      await this.questionRepository.save(answer.question);
    }

    // Delete answer
    await this.answerRepository.remove(answer);
  }

  /**
   * Award civic points
   */
  private async awardCivicPoints(
    userId: number,
    amount: number,
    type: PointType,
    referenceId: number,
    referenceType: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Update user civic points
    user.civic_points += amount;
    await this.updateUserCivicPoints(userId, user.civic_points);
  }

  /**
   * Helper: Update user civic points
   */
  private async updateUserCivicPoints(
    userId: number,
    points: number,
  ): Promise<void> {
    const dataSource = this.questionRepository.manager.connection;
    await dataSource.query(
      'UPDATE users SET civic_points = $1 WHERE id = $2',
      [points, userId],
    );
  }

  /**
   * Sanitize question data
   */
  private sanitizeQuestion(question: CourseQuestion): CourseQuestion {
    return {
      ...question,
      user: {
        ...question.user,
        password_hash: undefined as any,
        google_id: undefined as any,
      },
    };
  }

  /**
   * Sanitize answer data
   */
  private sanitizeAnswer(answer: CourseAnswer): CourseAnswer {
    return {
      ...answer,
      user: {
        ...answer.user,
        password_hash: undefined as any,
        google_id: undefined as any,
      },
    };
  }
}
