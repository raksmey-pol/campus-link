import type { ModerationCase } from "./types";

export const dashboardStats = [
  {
    title: "Pending Moderation",
    value: "24",
    note: "+12% since morning",
    tone: "danger",
  },
  {
    title: "Active Items",
    value: "142",
    note: "University-wide catalog",
    tone: "primary",
  },
  {
    title: "Total Reviews",
    value: "1.2k",
    note: "4.8 average rating",
    tone: "warning",
  },
  {
    title: "Swap Requests",
    value: "56",
    note: "14 awaiting match",
    tone: "neutral",
  },
] as const;

export const recentActivity = [
  {
    title: "New Course Review: CS101",
    subtitle: "Posted by Sarah Jenkins · 12 mins ago",
    type: "review",
  },
  {
    title: "Lost Item: Blue North Face Backpack",
    subtitle: "Reported at Student Union · 45 mins ago",
    type: "lost-found",
  },
  {
    title: "Textbook Swap Request",
    subtitle: "Organic Chemistry (9th Ed) · 2 hours ago",
    type: "swap",
  },
] as const;

export const pointsIssued = [
  { label: "Lost & Found", points: 450, width: 90 },
  { label: "Course Reviews", points: 320, width: 65 },
  { label: "Swap Board", points: 150, width: 30 },
] as const;

export const recentUsers = [
  {
    initials: "AJ",
    name: "Alex Johnson",
    email: "a.johnson@university.edu",
    score: 920,
    date: "Sep 12, 2023",
    status: "Approved",
  },
  {
    initials: "MK",
    name: "Maya Kapoor",
    email: "m.kapoor@university.edu",
    score: 780,
    date: "Oct 05, 2023",
    status: "Pending",
  },
  {
    initials: "LR",
    name: "Lucas Reed",
    email: "l.reed@university.edu",
    score: 450,
    date: "Nov 20, 2023",
    status: "Rejected",
  },
] as const;

export const moderationQueue: ModerationCase[] = [
  {
    id: "LF-8821",
    item: "Apple Watch Series 9",
    location: "Main Library (Floor 3)",
    tier: "High Value",
    reporter: "Julian Doe",
    initials: "JD",
    submittedAt: "Oct 24, 2023",
    aiStatus: "Flagged",
    status: "Pending",
    description:
      "Silver Apple Watch found on the back desk of reading room 302. No visible serial number on outer casing. Light scratches on the glass.",
    timeFound: "10:45 AM, Oct 24",
    casePriority: "High Priority",
    aiMatch: 88,
    objectRecognition: "Electronic Device (Watch)",
    policyRisk: "Potential Counterfeit (Flag)",
    locationContext: "High Confidence",
  },
  {
    id: "LF-8812",
    item: "Moleskine Journal",
    location: "Student Union Hall",
    tier: "Low Value",
    reporter: "Elena Vance",
    initials: "EV",
    submittedAt: "Oct 24, 2023",
    aiStatus: "Passed",
    status: "Approved",
    description:
      "Black Moleskine notebook with handwritten lecture notes. Found near the west lounge seating area.",
    timeFound: "2:15 PM, Oct 24",
    casePriority: "Low Priority",
    aiMatch: 94,
    objectRecognition: "Notebook / Stationery",
    policyRisk: "No policy concerns",
    locationContext: "High Confidence",
  },
  {
    id: "LF-8802",
    item: "Canon Camera Case",
    location: "Arts Quad Benches",
    tier: "Med Value",
    reporter: "Alex Miller",
    initials: "AM",
    submittedAt: "Oct 23, 2023",
    aiStatus: "Passed",
    status: "Rejected",
    description:
      "Brown camera case submitted with incomplete location details and mismatched timeline metadata.",
    timeFound: "5:30 PM, Oct 23",
    casePriority: "Medium Priority",
    aiMatch: 61,
    objectRecognition: "Camera Accessory",
    policyRisk: "Insufficient evidence",
    locationContext: "Moderate Confidence",
  },
];
