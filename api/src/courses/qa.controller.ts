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
import { QAService } from './qa.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { AcceptAnswerDto } from './dto/accept-answer.dto';
import { VoteAnswerDto } from './dto/vote-answer.dto';
import { PinQuestionDto } from './dto/pin-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';

@Controller('courses/:courseId/questions')
export class QuestionsController {
  constructor(private readonly qaService: QAService) {}

  /**
   * GET /courses/:courseId/questions
   * List questions for a course
   * Query params: sort (recent|most_viewed|unanswered), page (1-based)
   */
  @Get()
  async listQuestions(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query('sort') sort: 'recent' | 'most_viewed' | 'unanswered' = 'recent',
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
  ) {
    return this.qaService.getQuestionsByCourse(courseId, sort, page);
  }

  /**
   * POST /courses/:courseId/questions
   * Post a new question (requires auth)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createQuestion(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: User,
  ) {
    return this.qaService.createQuestion(courseId, user.id, dto);
  }
}

@Controller('questions')
export class QuestionDetailController {
  constructor(private readonly qaService: QAService) {}

  /**
   * GET /questions/:id
   * Get question detail with all answers
   */
  @Get(':id')
  async getQuestionDetail(@Param('id', ParseIntPipe) questionId: number) {
    return this.qaService.getQuestionDetail(questionId);
  }

  /**
   * PATCH /questions/:id/pin
   * Mod — pin question to the top of course Q&A
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Patch(':id/pin')
  async pinQuestion(
    @Param('id', ParseIntPipe) questionId: number,
    @Body() dto: PinQuestionDto,
    @CurrentUser() user: User,
  ) {
    return this.qaService.pinQuestion(questionId, user.id, dto);
  }

  /**
   * DELETE /questions/:id
   * Mod/Admin — delete a question
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Delete(':id')
  async deleteQuestion(@Param('id', ParseIntPipe) questionId: number) {
    await this.qaService.deleteQuestion(questionId);
    return { message: 'Question deleted successfully' };
  }
}

@Controller('questions/:questionId/answers')
export class AnswersController {
  constructor(private readonly qaService: QAService) {}

  /**
   * POST /questions/:questionId/answers
   * Post an answer to a question (requires auth)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createAnswer(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: CreateAnswerDto,
    @CurrentUser() user: User,
  ) {
    return this.qaService.createAnswer(questionId, user.id, dto);
  }

  /**
   * PATCH /questions/:questionId/answers/:answerId/accept
   * Question author — mark an answer as accepted
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':answerId/accept')
  async acceptAnswer(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Param('answerId', ParseIntPipe) answerId: number,
    @Body() dto: AcceptAnswerDto,
    @CurrentUser() user: User,
  ) {
    return this.qaService.acceptAnswer(questionId, answerId, user.id, dto);
  }

  /**
   * POST /questions/:questionId/answers/:answerId/vote
   * Vote on an answer (upvote or downvote)
   */
  @UseGuards(JwtAuthGuard)
  @Post(':answerId/vote')
  async voteAnswer(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Param('answerId', ParseIntPipe) answerId: number,
    @Body() dto: VoteAnswerDto,
    @CurrentUser() user: User,
  ) {
    return this.qaService.voteAnswer(answerId, user.id, dto);
  }
}

@Controller('answers')
export class AnswerModController {
  constructor(private readonly qaService: QAService) {}

  /**
   * DELETE /answers/:id
   * Mod/Admin — delete an answer
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Delete(':id')
  async deleteAnswer(@Param('id', ParseIntPipe) answerId: number) {
    await this.qaService.deleteAnswer(answerId);
    return { message: 'Answer deleted successfully' };
  }
}
