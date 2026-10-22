export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  NEEDS_REVIEW = 'needs_review',
  REJECTED = 'rejected',
  QUARANTINED = 'quarantined',
}

export type ModerationSource = 'ai_video' | 'ai_text' | 'admin';
