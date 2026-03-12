export enum UserRole {
  USER = 'USER',
  MENTOR = 'MENTOR',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export enum ItemStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CLAIMED = 'CLAIMED',
  RESOLVED = 'RESOLVED',
}

export enum ValueTier {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum ClaimStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ResourceType {
  NOTES = 'NOTES',
  PAST_ASSESSMENT = 'PAST_ASSESSMENT',
  EXTERNAL_LINK = 'EXTERNAL_LINK',
  PROJECT_EXAMPLE = 'PROJECT_EXAMPLE',
}

export enum ResourceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum SwapType {
  SECTION = 'SECTION',
  COURSE = 'COURSE',
}

export enum SwapStatus {
  OPEN = 'OPEN',
  MATCHED = 'MATCHED',
  ACCEPTED = 'ACCEPTED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum MatchType {
  DIRECT = 'DIRECT',
  CHAIN = 'CHAIN',
}

export enum MatchStatus {
  PROPOSED = 'PROPOSED',
  ACCEPTED = 'ACCEPTED',
  COMPLETED = 'COMPLETED',
  DECLINED = 'DECLINED',
}

export enum PointType {
  FINDER_REWARD = 'FINDER_REWARD',
  TRUST_CONFIRM = 'TRUST_CONFIRM',
  RESOURCE_UPLOAD = 'RESOURCE_UPLOAD',
  REVIEW_HELPFUL = 'REVIEW_HELPFUL',
  QA_UPVOTE = 'QA_UPVOTE',
  MENTOR_BONUS = 'MENTOR_BONUS',
  SWAP_COMPLETE = 'SWAP_COMPLETE',
}

export enum NotificationModule {
  LOST_AND_FOUND = 'LOST_AND_FOUND',
  COURSE_COMMUNITY = 'COURSE_COMMUNITY',
  SWAP = 'SWAP',
  SYSTEM = 'SYSTEM',
}

export enum ModerationTarget {
  ITEM = 'ITEM',
  CLAIM = 'CLAIM',
  REVIEW = 'REVIEW',
  RESOURCE = 'RESOURCE',
  QUESTION = 'QUESTION',
  ANSWER = 'ANSWER',
}

export enum ModerationActionType {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
  REMOVED = 'REMOVED',
}

export enum VoteValue {
  UP = 'UP',
  DOWN = 'DOWN',
}
