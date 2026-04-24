export type AdminNavKey =
  | "overview"
  | "lost-found"
  | "course-reviews"
  | "swap-board"
  | "users"
  | "point-ledger"
  | "reports";

export type ModerationStatus = "Pending" | "Approved" | "Claimed" | "Resolved" | "Rejected";
export type AiStatus = "Flagged" | "Passed";
export type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";

export type BackendClaim = {
  id: number;
  claimer: {
    id: number;
    display_name: string;
    avatar_url: string | null;
  };
  proof_description: string;
  status: ClaimStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type ModerationCase = {
  id: string;
  item: string;
  photoUrl: string | null;
  location: string;
  tier: string;
  reporter: string;
  initials: string;
  submittedAt: string;
  aiStatus: AiStatus;
  status: ModerationStatus;
  description: string;
  timeFound: string;
  casePriority: string;
  aiMatch: number;
  objectRecognition: string;
  policyRisk: string;
  locationContext: string;
  claimSummary?: {
    totalClaims: number;
    pendingClaims: number;
    approvedClaims: number;
    rejectedClaims: number;
  };
  resolveState?: {
    isResolved: boolean;
    finderConfirmed: boolean;
    claimerConfirmed: boolean;
    resolvedAt: string | null;
  };
};
