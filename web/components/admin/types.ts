export type AdminNavKey =
  | "overview"
  | "lost-found"
  | "course-reviews"
  | "swap-board"
  | "users"
  | "point-ledger"
  | "reports";

export type ModerationStatus = "Pending" | "Approved" | "Rejected";
export type AiStatus = "Flagged" | "Passed";

export type ModerationCase = {
  id: string;
  item: string;
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
};
