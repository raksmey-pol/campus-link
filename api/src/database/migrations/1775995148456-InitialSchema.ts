import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1775995148456 implements MigrationInterface {
  name = 'InitialSchema1775995148456';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "courses" ("id" SERIAL NOT NULL, "code" character varying(20) NOT NULL, "title" character varying(200) NOT NULL, "credits" integer NOT NULL, "department" character varying(100) NOT NULL, "prerequisites" text, "description" text, "avg_difficulty" numeric(3,2) NOT NULL DEFAULT '0', "avg_workload" numeric(4,1) NOT NULL DEFAULT '0', "avg_quality" numeric(3,2) NOT NULL DEFAULT '0', "avg_usefulness" numeric(3,2) NOT NULL DEFAULT '0', "avg_recommendation" numeric(3,2) NOT NULL DEFAULT '0', "review_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_86b3589486bac01d2903e22471c" UNIQUE ("code"), CONSTRAINT "PK_3f70a487cc718ad8eda4e6d58c9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."swap_requests_swap_type_enum" AS ENUM('SECTION', 'COURSE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."swap_requests_status_enum" AS ENUM('OPEN', 'MATCHED', 'ACCEPTED', 'COMPLETED', 'EXPIRED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "swap_requests" ("id" SERIAL NOT NULL, "swap_type" "public"."swap_requests_swap_type_enum" NOT NULL, "current_section" character varying(10), "desired_section" character varying(10), "notes" text, "status" "public"."swap_requests_status_enum" NOT NULL DEFAULT 'OPEN', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "cooldown_until" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "requester_id" integer NOT NULL, "current_course_id" integer NOT NULL, "desired_course_id" integer, CONSTRAINT "PK_4a3a8b292e0e8df37acbc47e648" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."swap_matches_match_type_enum" AS ENUM('DIRECT', 'CHAIN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."swap_matches_status_enum" AS ENUM('PROPOSED', 'ACCEPTED', 'COMPLETED', 'DECLINED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "swap_matches" ("id" SERIAL NOT NULL, "match_type" "public"."swap_matches_match_type_enum" NOT NULL, "status" "public"."swap_matches_status_enum" NOT NULL DEFAULT 'PROPOSED', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "request_a_id" integer NOT NULL, "request_b_id" integer NOT NULL, "request_c_id" integer, CONSTRAINT "PK_d26dc7b4425e2a3c4849c52ebbe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "swap_confirmations" ("id" SERIAL NOT NULL, "confirmed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "match_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_2856c0dc6519a5503e8191b36ce" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_swap_confirmation_user" ON "swap_confirmations" ("match_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."swap_audit_log_from_status_enum" AS ENUM('OPEN', 'MATCHED', 'ACCEPTED', 'COMPLETED', 'EXPIRED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."swap_audit_log_to_status_enum" AS ENUM('OPEN', 'MATCHED', 'ACCEPTED', 'COMPLETED', 'EXPIRED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "swap_audit_log" ("id" SERIAL NOT NULL, "from_status" "public"."swap_audit_log_from_status_enum" NOT NULL, "to_status" "public"."swap_audit_log_to_status_enum" NOT NULL, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "swap_request_id" integer NOT NULL, "actor_id" integer NOT NULL, CONSTRAINT "PK_78eea91a0345f9c090435ea913c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."course_reviews_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_reviews" ("id" SERIAL NOT NULL, "difficulty" integer NOT NULL, "workload_hours" numeric(4,1) NOT NULL, "quality" integer NOT NULL, "usefulness" integer NOT NULL, "recommendation" integer NOT NULL, "review_text" text, "is_anonymous" boolean NOT NULL DEFAULT false, "helpfulness_votes" integer NOT NULL DEFAULT '0', "status" "public"."course_reviews_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "course_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_2dc117d5b688a2040125a09d1f1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_course_review_user" ON "course_reviews" ("course_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "review_votes" ("id" SERIAL NOT NULL, "is_helpful" boolean NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "review_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_687569add3c5a70950438fa0cee" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_review_vote_user" ON "review_votes" ("review_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."course_resources_type_enum" AS ENUM('NOTES', 'PAST_ASSESSMENT', 'EXTERNAL_LINK', 'PROJECT_EXAMPLE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."course_resources_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_resources" ("id" SERIAL NOT NULL, "type" "public"."course_resources_type_enum" NOT NULL, "title" character varying(200) NOT NULL, "description" text, "file_url" text, "link_url" text, "upvotes" integer NOT NULL DEFAULT '0', "downvotes" integer NOT NULL DEFAULT '0', "status" "public"."course_resources_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "course_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_507049dc482f8148211142994ed" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."resource_votes_vote_enum" AS ENUM('UP', 'DOWN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "resource_votes" ("id" SERIAL NOT NULL, "vote" "public"."resource_votes_vote_enum" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "resource_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_366341391193f7724099f4a76d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_resource_vote_user" ON "resource_votes" ("resource_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."point_transactions_type_enum" AS ENUM('FINDER_REWARD', 'TRUST_CONFIRM', 'RESOURCE_UPLOAD', 'REVIEW_HELPFUL', 'QA_UPVOTE', 'MENTOR_BONUS', 'SWAP_COMPLETE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "point_transactions" ("id" SERIAL NOT NULL, "amount" integer NOT NULL, "type" "public"."point_transactions_type_enum" NOT NULL, "reference_id" integer, "reference_type" character varying(50), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer NOT NULL, CONSTRAINT "PK_ceb5185b63f070e23d65509b0a7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_module_enum" AS ENUM('LOST_AND_FOUND', 'COURSE_COMMUNITY', 'SWAP', 'SYSTEM')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "module" "public"."notifications_module_enum" NOT NULL, "type" character varying(50) NOT NULL, "title" character varying(200) NOT NULL, "body" text, "reference_id" integer, "reference_type" character varying(50), "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer NOT NULL, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."moderation_actions_target_type_enum" AS ENUM('ITEM', 'CLAIM', 'REVIEW', 'RESOURCE', 'QUESTION', 'ANSWER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."moderation_actions_action_enum" AS ENUM('APPROVED', 'REJECTED', 'FLAGGED', 'REMOVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "moderation_actions" ("id" SERIAL NOT NULL, "target_type" "public"."moderation_actions_target_type_enum" NOT NULL, "target_id" integer NOT NULL, "action" "public"."moderation_actions_action_enum" NOT NULL, "reason" text, "spam_score" numeric(5,4), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "moderator_id" integer NOT NULL, CONSTRAINT "PK_d259906fb4d2a5ef718f1f66e35" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."items_value_tier_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."items_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CLAIMED', 'RESOLVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "items" ("id" SERIAL NOT NULL, "title" character varying(200) NOT NULL, "description" text NOT NULL, "photo_url" text NOT NULL, "value_tier" "public"."items_value_tier_enum" NOT NULL, "status" "public"."items_status_enum" NOT NULL DEFAULT 'PENDING', "location" character varying(300) NOT NULL, "telegram_message_id" bigint, "resolved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reporter_id" integer NOT NULL, "moderator_id" integer, CONSTRAINT "UQ_c295e33440e47ebd6c16152aaca" UNIQUE ("telegram_message_id"), CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_questions" ("id" SERIAL NOT NULL, "title" character varying(300) NOT NULL, "body" text NOT NULL, "view_count" integer NOT NULL DEFAULT '0', "answer_count" integer NOT NULL DEFAULT '0', "is_pinned" boolean NOT NULL DEFAULT false, "is_closed" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "course_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_d7392fe407562e5e5b1cf1a3488" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_mentors" ("id" SERIAL NOT NULL, "earned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "total_contributions" integer NOT NULL DEFAULT '0', "course_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_02f8e9090a6d7f505adf3171418" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_course_mentor_user" ON "course_mentors" ("course_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "course_followers" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "course_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_bf61107c9a5b6d1587fc65c7dcf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_course_follower_user" ON "course_followers" ("course_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "course_answers" ("id" SERIAL NOT NULL, "body" text NOT NULL, "upvotes" integer NOT NULL DEFAULT '0', "is_accepted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "question_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_e98b2380d2368f5f26c6ff08488" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."claims_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "claims" ("id" SERIAL NOT NULL, "proof_description" text NOT NULL, "status" "public"."claims_status_enum" NOT NULL DEFAULT 'PENDING', "rejection_reason" text, "reviewed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "item_id" integer NOT NULL, "claimer_id" integer NOT NULL, "moderator_id" integer, CONSTRAINT "PK_96c91970c0dcb2f69fdccd0a698" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "answer_votes" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "answer_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_767f6bc508e4f2d6d08d65beb31" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_answer_vote_user" ON "answer_votes" ("answer_id", "user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_requests" ADD CONSTRAINT "FK_5361b1dfafc1c0124525fbd2409" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_requests" ADD CONSTRAINT "FK_cf89fa46564a182868e5d9c6008" FOREIGN KEY ("current_course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_requests" ADD CONSTRAINT "FK_647bf19365b8ab3915935ce8205" FOREIGN KEY ("desired_course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_matches" ADD CONSTRAINT "FK_c48a3e4067b089d8d6be289929c" FOREIGN KEY ("request_a_id") REFERENCES "swap_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_matches" ADD CONSTRAINT "FK_3fa0ff34fd392c68e125629c042" FOREIGN KEY ("request_b_id") REFERENCES "swap_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_matches" ADD CONSTRAINT "FK_1f51a4e26ea62447a5cfd5692a6" FOREIGN KEY ("request_c_id") REFERENCES "swap_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_confirmations" ADD CONSTRAINT "FK_7b3f4231146a65a8f2e4bb4e0f0" FOREIGN KEY ("match_id") REFERENCES "swap_matches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_confirmations" ADD CONSTRAINT "FK_4a7eb24a417d6e0906cbeabdbb0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_audit_log" ADD CONSTRAINT "FK_8a1ad641f49b1c7a4fb4b8bedf2" FOREIGN KEY ("swap_request_id") REFERENCES "swap_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_audit_log" ADD CONSTRAINT "FK_16f2f45351789161923ed4aeaca" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_reviews" ADD CONSTRAINT "FK_1f69fdcbd7ea5f0e52c3230c00b" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_reviews" ADD CONSTRAINT "FK_4f144342761fa0c6c3f129da76c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_votes" ADD CONSTRAINT "FK_af2c4c96175fc38988113888ef6" FOREIGN KEY ("review_id") REFERENCES "course_reviews"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_votes" ADD CONSTRAINT "FK_7f5ce2080e4dbf66c98fa717d65" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_resources" ADD CONSTRAINT "FK_630ac006cbe95cc39ba409eb48d" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_resources" ADD CONSTRAINT "FK_296dc3e6b04651dbbfe1f7ea98a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_votes" ADD CONSTRAINT "FK_81d757153f1721602ed78a7dbe0" FOREIGN KEY ("resource_id") REFERENCES "course_resources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_votes" ADD CONSTRAINT "FK_a9fa07af2dc888d9878a93be035" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "point_transactions" ADD CONSTRAINT "FK_56702c8b9e89190347707b75552" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "moderation_actions" ADD CONSTRAINT "FK_d891b13e150f7bf62e48f349d82" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "FK_965cfea509109808171b39ff65f" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "FK_90502668d4c60eba8f4709c3fef" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_questions" ADD CONSTRAINT "FK_89555c31dbad7ffb359b429b77f" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_questions" ADD CONSTRAINT "FK_6e4dd60fd03145283fd4b668e92" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_mentors" ADD CONSTRAINT "FK_5c622e6a19524ac1483b1e52dad" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_mentors" ADD CONSTRAINT "FK_f29e5d27437caacb9efcd3af69b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_followers" ADD CONSTRAINT "FK_6e08623099e38351991190b5a30" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_followers" ADD CONSTRAINT "FK_2518b813aa93304063c3b6fcd18" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_answers" ADD CONSTRAINT "FK_6b2650ec0d65bd832c02d25310c" FOREIGN KEY ("question_id") REFERENCES "course_questions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_answers" ADD CONSTRAINT "FK_6d3ac9bf8e5888a1b642031c9bf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ADD CONSTRAINT "FK_883b102a389ac1a792063a1a65f" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ADD CONSTRAINT "FK_dc9679cf2c0d6b4ee640dec34ad" FOREIGN KEY ("claimer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ADD CONSTRAINT "FK_b2a6d2d670b594c37d22030363d" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "answer_votes" ADD CONSTRAINT "FK_f0157023465e675660fd1709118" FOREIGN KEY ("answer_id") REFERENCES "course_answers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "answer_votes" ADD CONSTRAINT "FK_ab3699386b605aa8235fde46cc4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "answer_votes" DROP CONSTRAINT "FK_ab3699386b605aa8235fde46cc4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "answer_votes" DROP CONSTRAINT "FK_f0157023465e675660fd1709118"`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" DROP CONSTRAINT "FK_b2a6d2d670b594c37d22030363d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" DROP CONSTRAINT "FK_dc9679cf2c0d6b4ee640dec34ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" DROP CONSTRAINT "FK_883b102a389ac1a792063a1a65f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_answers" DROP CONSTRAINT "FK_6d3ac9bf8e5888a1b642031c9bf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_answers" DROP CONSTRAINT "FK_6b2650ec0d65bd832c02d25310c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_followers" DROP CONSTRAINT "FK_2518b813aa93304063c3b6fcd18"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_followers" DROP CONSTRAINT "FK_6e08623099e38351991190b5a30"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_mentors" DROP CONSTRAINT "FK_f29e5d27437caacb9efcd3af69b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_mentors" DROP CONSTRAINT "FK_5c622e6a19524ac1483b1e52dad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_questions" DROP CONSTRAINT "FK_6e4dd60fd03145283fd4b668e92"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_questions" DROP CONSTRAINT "FK_89555c31dbad7ffb359b429b77f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" DROP CONSTRAINT "FK_90502668d4c60eba8f4709c3fef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" DROP CONSTRAINT "FK_965cfea509109808171b39ff65f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "moderation_actions" DROP CONSTRAINT "FK_d891b13e150f7bf62e48f349d82"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "point_transactions" DROP CONSTRAINT "FK_56702c8b9e89190347707b75552"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_votes" DROP CONSTRAINT "FK_a9fa07af2dc888d9878a93be035"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_votes" DROP CONSTRAINT "FK_81d757153f1721602ed78a7dbe0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_resources" DROP CONSTRAINT "FK_296dc3e6b04651dbbfe1f7ea98a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_resources" DROP CONSTRAINT "FK_630ac006cbe95cc39ba409eb48d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_votes" DROP CONSTRAINT "FK_7f5ce2080e4dbf66c98fa717d65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_votes" DROP CONSTRAINT "FK_af2c4c96175fc38988113888ef6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_reviews" DROP CONSTRAINT "FK_4f144342761fa0c6c3f129da76c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_reviews" DROP CONSTRAINT "FK_1f69fdcbd7ea5f0e52c3230c00b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_audit_log" DROP CONSTRAINT "FK_16f2f45351789161923ed4aeaca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_audit_log" DROP CONSTRAINT "FK_8a1ad641f49b1c7a4fb4b8bedf2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_confirmations" DROP CONSTRAINT "FK_4a7eb24a417d6e0906cbeabdbb0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_confirmations" DROP CONSTRAINT "FK_7b3f4231146a65a8f2e4bb4e0f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_matches" DROP CONSTRAINT "FK_1f51a4e26ea62447a5cfd5692a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_matches" DROP CONSTRAINT "FK_3fa0ff34fd392c68e125629c042"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_matches" DROP CONSTRAINT "FK_c48a3e4067b089d8d6be289929c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_requests" DROP CONSTRAINT "FK_647bf19365b8ab3915935ce8205"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_requests" DROP CONSTRAINT "FK_cf89fa46564a182868e5d9c6008"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_requests" DROP CONSTRAINT "FK_5361b1dfafc1c0124525fbd2409"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_answer_vote_user"`);
    await queryRunner.query(`DROP TABLE "answer_votes"`);
    await queryRunner.query(`DROP TABLE "claims"`);
    await queryRunner.query(`DROP TYPE "public"."claims_status_enum"`);
    await queryRunner.query(`DROP TABLE "course_answers"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_course_follower_user"`);
    await queryRunner.query(`DROP TABLE "course_followers"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_course_mentor_user"`);
    await queryRunner.query(`DROP TABLE "course_mentors"`);
    await queryRunner.query(`DROP TABLE "course_questions"`);
    await queryRunner.query(`DROP TABLE "items"`);
    await queryRunner.query(`DROP TYPE "public"."items_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."items_value_tier_enum"`);
    await queryRunner.query(`DROP TABLE "moderation_actions"`);
    await queryRunner.query(
      `DROP TYPE "public"."moderation_actions_action_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."moderation_actions_target_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_module_enum"`);
    await queryRunner.query(`DROP TABLE "point_transactions"`);
    await queryRunner.query(
      `DROP TYPE "public"."point_transactions_type_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_resource_vote_user"`);
    await queryRunner.query(`DROP TABLE "resource_votes"`);
    await queryRunner.query(`DROP TYPE "public"."resource_votes_vote_enum"`);
    await queryRunner.query(`DROP TABLE "course_resources"`);
    await queryRunner.query(
      `DROP TYPE "public"."course_resources_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."course_resources_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_review_vote_user"`);
    await queryRunner.query(`DROP TABLE "review_votes"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_course_review_user"`);
    await queryRunner.query(`DROP TABLE "course_reviews"`);
    await queryRunner.query(`DROP TYPE "public"."course_reviews_status_enum"`);
    await queryRunner.query(`DROP TABLE "swap_audit_log"`);
    await queryRunner.query(
      `DROP TYPE "public"."swap_audit_log_to_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."swap_audit_log_from_status_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_swap_confirmation_user"`);
    await queryRunner.query(`DROP TABLE "swap_confirmations"`);
    await queryRunner.query(`DROP TABLE "swap_matches"`);
    await queryRunner.query(`DROP TYPE "public"."swap_matches_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."swap_matches_match_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "swap_requests"`);
    await queryRunner.query(`DROP TYPE "public"."swap_requests_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."swap_requests_swap_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "courses"`);
  }
}
