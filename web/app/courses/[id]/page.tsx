"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import {
  Star,
  FileText,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { coursesApi } from "@/lib/api";

interface Course {
  id: number;
  code: string;
  title: string;
  department: string;
  credits: number;
  avgDifficulty?: number;
  avgQuality?: number;
  avgWorkload?: number;
  avgUsefulness?: number;
  reviewCount?: number;
  description?: string;
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

function RatingBar({ label, value, max = 5 }: { label: string; value: number | string; max?: number }) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-surface">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${(numValue / max) * 100}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground w-8 text-right">{numValue.toFixed(1)}</span>
    </div>
  );
}

export default function CourseDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourse() {
      try {
        setLoading(true);
        setError(null);
        const data = await coursesApi.getCourse(parseInt(id, 10));
        setCourse(data);
      } catch (err) {
        console.error('Failed to fetch course:', err);
        setError('Failed to load course details');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchCourse();
    }
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="rounded-2xl bg-card shadow-card p-5 animate-pulse">
            <div className="h-6 w-32 bg-surface rounded mb-3" />
            <div className="h-7 w-48 bg-surface rounded mb-2" />
            <div className="h-4 w-40 bg-surface rounded mt-3" />
          </div>
          <div className="rounded-2xl bg-card shadow-card p-5 space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-20 bg-surface rounded" />
                <div className="flex-1 h-2 bg-surface rounded" />
                <div className="h-3 w-8 bg-surface rounded" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !course) {
    return (
      <AppLayout>
        <div className="space-y-5">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-xs text-destructive">{error || 'Course not found'}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Course Header Card */}
        <div className="rounded-2xl bg-card shadow-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {course.code}
            </span>
            <span className="text-xs text-muted-foreground">{course.department} · {course.credits} credits</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{course.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{course.reviewCount} reviews</p>

          <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-surface">
            <Star className="h-6 w-6 text-warning fill-warning" />
            <span className="text-3xl font-bold text-foreground">{course.avgQuality ?? 0}</span>
            <span className="text-sm text-muted-foreground">/ 5</span>
          </div>
        </div>

        {/* Rating Breakdown */}
        <div className="rounded-2xl bg-card shadow-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Rating Breakdown</h3>
          <RatingBar label="Quality" value={course.avgQuality ?? 0} />
          <RatingBar label="Difficulty" value={course.avgDifficulty ?? 0} />
          <RatingBar label="Workload" value={course.avgWorkload ?? 0} />
          <RatingBar label="Usefulness" value={course.avgUsefulness ?? 0} />
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
