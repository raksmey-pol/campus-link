"use client";

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  Search,
  Star,
  BookOpen,
  FileText,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Course {
  id: number;
  code: string;
  title: string;
  department: string;
  credits: number;
  avgDifficulty: number;
  avgQuality: number;
  avgWorkload: number;
  avgUsefulness: number;
  reviewCount: number;
}

interface Review {
  id: number;
  user: string;
  rating: number;
  text: string;
  difficulty: number;
  isAnonymous: boolean;
  helpfulnessVotes: number;
  createdAt: string;
}

const mockCourses: Course[] = [
  { id: 1, code: "INFO 653", title: "Web Development III", department: "SDT", credits: 3, avgDifficulty: 3.8, avgQuality: 4.5, avgWorkload: 4.0, avgUsefulness: 4.7, reviewCount: 24 },
  { id: 2, code: "CS 201", title: "Data Structures & Algorithms", department: "SDT", credits: 3, avgDifficulty: 4.2, avgQuality: 4.0, avgWorkload: 4.5, avgUsefulness: 4.8, reviewCount: 42 },
  { id: 3, code: "MATH 301", title: "Linear Algebra", department: "SAS", credits: 3, avgDifficulty: 4.5, avgQuality: 3.8, avgWorkload: 3.5, avgUsefulness: 4.0, reviewCount: 18 },
  { id: 4, code: "ENG 102", title: "Academic Writing II", department: "SAS", credits: 3, avgDifficulty: 2.5, avgQuality: 3.5, avgWorkload: 3.0, avgUsefulness: 3.2, reviewCount: 31 },
  { id: 5, code: "CS 305", title: "Database Systems", department: "SDT", credits: 3, avgDifficulty: 3.5, avgQuality: 4.2, avgWorkload: 3.8, avgUsefulness: 4.6, reviewCount: 27 },
  { id: 6, code: "BUS 201", title: "Principles of Management", department: "SBA", credits: 3, avgDifficulty: 2.0, avgQuality: 3.0, avgWorkload: 2.5, avgUsefulness: 3.0, reviewCount: 15 },
];

const mockReviews: Review[] = [
  { id: 1, user: "Anonymous", rating: 5, text: "Excellent course! Professor Monyrath explains everything clearly. The final project is challenging but rewarding.", difficulty: 4, isAnonymous: true, helpfulnessVotes: 12, createdAt: "2 weeks ago" },
  { id: 2, user: "Raksmey P.", rating: 4, text: "Great course for learning full-stack development. Lots of hands-on coding. Make sure to start assignments early.", difficulty: 4, isAnonymous: false, helpfulnessVotes: 8, createdAt: "1 month ago" },
  { id: 3, user: "Anonymous", rating: 4, text: "Very practical and useful. The workload is heavy but you learn a lot. Would recommend.", difficulty: 3, isAnonymous: true, helpfulnessVotes: 5, createdAt: "2 months ago" },
];

const questions = [
  { id: 1, title: "What textbook is recommended for this course?", answers: 3, views: 45, author: "Kimhong R.", time: "3 days ago" },
  { id: 2, title: "Is there a prerequisite for this course?", answers: 2, views: 32, author: "Sovanrith S.", time: "1 week ago" },
  { id: 3, title: "How is the final exam structured?", answers: 5, views: 78, author: "Anonymous", time: "2 weeks ago" },
];

function RatingBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-surface">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export default function Courses() {
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const filtered = mockCourses.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.department.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedCourse) {
    return (
      <AppLayout>
        <div className="space-y-5">
          <button
            onClick={() => setSelectedCourse(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {/* Course Header Card */}
          <div className="rounded-2xl bg-card shadow-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {selectedCourse.code}
              </span>
              <span className="text-xs text-muted-foreground">{selectedCourse.department} · {selectedCourse.credits} credits</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">{selectedCourse.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{selectedCourse.reviewCount} reviews</p>

            <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-surface">
              <Star className="h-6 w-6 text-warning fill-warning" />
              <span className="text-3xl font-bold text-foreground">{selectedCourse.avgQuality}</span>
              <span className="text-sm text-muted-foreground">/ 5</span>
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="rounded-2xl bg-card shadow-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Rating Breakdown</h3>
            <RatingBar label="Quality" value={selectedCourse.avgQuality} />
            <RatingBar label="Difficulty" value={selectedCourse.avgDifficulty} />
            <RatingBar label="Workload" value={selectedCourse.avgWorkload} />
            <RatingBar label="Usefulness" value={selectedCourse.avgUsefulness} />
          </div>

          <Tabs defaultValue="reviews">
            <TabsList className="rounded-xl bg-surface p-1 w-full">
              <TabsTrigger value="reviews" className="flex-1 rounded-lg text-xs">Reviews ({mockReviews.length})</TabsTrigger>
              <TabsTrigger value="questions" className="flex-1 rounded-lg text-xs">Q&A ({questions.length})</TabsTrigger>
              <TabsTrigger value="resources" className="flex-1 rounded-lg text-xs">Resources</TabsTrigger>
            </TabsList>
            <TabsContent value="reviews" className="space-y-3 mt-4">
              {mockReviews.map((review) => (
                <div key={review.id} className="rounded-2xl bg-card shadow-card p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn("h-3.5 w-3.5", i < review.rating ? "text-warning fill-warning" : "text-muted")}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {review.user} · {review.createdAt}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground leading-relaxed">{review.text}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-success transition-colors">
                      <ThumbsUp className="h-3 w-3" />
                      Helpful ({review.helpfulnessVotes})
                    </button>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              <Button className="w-full rounded-xl h-11">Write a Review</Button>
            </TabsContent>
            <TabsContent value="questions" className="space-y-3 mt-4">
              {questions.map((q) => (
                <div key={q.id} className="rounded-2xl bg-card shadow-card p-4 cursor-pointer hover:shadow-card-hover transition-all">
                  <p className="text-sm font-medium text-foreground">{q.title}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{q.answers} answers</span>
                    <span>{q.views} views</span>
                    <span>{q.author} · {q.time}</span>
                  </div>
                </div>
              ))}
              <Button className="w-full rounded-xl h-11">Ask a Question</Button>
            </TabsContent>
            <TabsContent value="resources" className="mt-4">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-card shadow-card py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">No resources yet</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to share!</p>
                <Button variant="outline" className="mt-4 rounded-xl">Upload Resource</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Courses</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Browse and review courses</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 rounded-xl bg-card shadow-card border-0 h-11"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((course) => (
            <div
              key={course.id}
              onClick={() => setSelectedCourse(course)}
              className="flex items-center gap-3 rounded-2xl bg-card shadow-card p-4 transition-all hover:shadow-card-hover cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">{course.code}</span>
                  <span className="text-[10px] text-muted-foreground">{course.department}</span>
                </div>
                <p className="text-sm font-medium text-foreground mt-0.5">{course.title}</p>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-warning fill-warning" />
                    {course.avgQuality}
                  </span>
                  <span>{course.reviewCount} reviews</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
