"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { fetchCourseById, type Course } from "@/lib/services/courses";
import { fetchReviews, type CourseReview, createReview, voteReview, type CreateReviewPayload } from "@/lib/services/reviews";
import { fetchQuestions, type CourseQuestion, createQuestion, type CreateQuestionPayload } from "@/lib/services/qa";
import { fetchResources, type CourseResource, createResource, voteResource, type CreateResourcePayload, type VoteResourcePayload } from "@/lib/services/resources";

// Fallback mock data when API fails
const mockReviewsFallback: CourseReview[] = [
  {
    id: 1,
    difficulty: 4,
    workload_hours: 15,
    quality: 5,
    usefulness: 5,
    recommendation: 5,
    review_text: "Excellent course! Very well structured and engaging lectures.",
    is_anonymous: false,
    helpfulness_votes: 12,
    status: "APPROVED",
    created_at: "2 weeks ago",
    updated_at: "2 weeks ago",
    user: { id: 1, display_name: "Raksmey P." },
  },
  {
    id: 2,
    difficulty: 4,
    workload_hours: 12,
    quality: 4,
    usefulness: 4,
    recommendation: 4,
    review_text: "Great course with lots of hands-on projects.",
    is_anonymous: true,
    helpfulness_votes: 8,
    status: "APPROVED",
    created_at: "1 month ago",
    updated_at: "1 month ago",
  },
];

const mockQuestionsFallback: CourseQuestion[] = [
  {
    id: 1,
    title: "What textbook is recommended for this course?",
    body: "Looking for recommended readings",
    view_count: 45,
    answer_count: 3,
    is_pinned: false,
    is_closed: false,
    created_at: "3 days ago",
    updated_at: "3 days ago",
    user: { id: 1, display_name: "Kimhong R." },
  },
];

function RatingBar({ label, value, max = 5 }: { label: string; value: number | string; max?: number }) {
  let numValue = 0;
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    numValue = isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  } else {
    numValue = isNaN(value) || !isFinite(value) ? 0 : value;
  }
  
  const percentage = Math.min((numValue / max) * 100, 100);
  
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="w-20 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground w-12 text-right">{numValue.toFixed(1)}</span>
    </div>
  );
}

export default function CourseDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [questions, setQuestions] = useState<CourseQuestion[]>([]);
  const [resources, setResources] = useState<CourseResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMockData, setShowMockData] = useState(false);

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewFormLoading, setReviewFormLoading] = useState(false);
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateReviewPayload>({
    quality: 5,
    difficulty: 3,
    workload_hours: 10,
    usefulness: 5,
    recommendation: 5,
    review_text: "",
    is_anonymous: false,
  });

  // Ask question form state
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionFormLoading, setQuestionFormLoading] = useState(false);
  const [questionFormError, setQuestionFormError] = useState<string | null>(null);
  const [questionFormData, setQuestionFormData] = useState<CreateQuestionPayload>({
    title: "",
    body: "",
  });

  // Upload resource form state
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resourceFormLoading, setResourceFormLoading] = useState(false);
  const [resourceFormError, setResourceFormError] = useState<string | null>(null);
  const [resourceVotes, setResourceVotes] = useState<Map<number, "UP" | "DOWN">>(new Map());
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceFormData, setResourceFormData] = useState<CreateResourcePayload>({
    type: "NOTES",
    title: "",
    description: "",
    file_url: "",
    link_url: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        setShowMockData(false);
        
        console.log('[CourseDetail] Route params id:', id);
        const courseId = parseInt(id, 10);
        console.log('[CourseDetail] Parsed courseId:', courseId, 'isNaN:', isNaN(courseId));
        
        // Validate courseId
        if (isNaN(courseId) || courseId <= 0) {
          throw new Error('Invalid course ID');
        }
        
        console.log(`Loading course data for courseId: ${courseId}`);
        
        // Fetch course (required)
        const courseData = await fetchCourseById(courseId);
        setCourse(courseData);
        
        // Fetch reviews and questions (optional - use mock fallback on error)
        try {
          console.log(`Fetching reviews for courseId: ${courseId}`);
          const reviewsData = await fetchReviews(courseId);
          console.log('Reviews data received:', reviewsData);
          setReviews(reviewsData.data || []);
        } catch (err: any) {
          console.error('Failed to fetch reviews:', err?.message || err);
          console.error('Full error:', err);
          setReviews(mockReviewsFallback);
          setShowMockData(true);
        }
        
        try {
          console.log(`Fetching questions for courseId: ${courseId}`);
          const questionsData = await fetchQuestions(courseId);
          console.log('Questions data received:', questionsData);
          setQuestions(questionsData.data || []);
        } catch (err: any) {
          console.error('Failed to fetch questions:', err?.message || err);
          console.error('Full error:', err);
          setQuestions(mockQuestionsFallback);
          setShowMockData(true);
        }

        try {
          console.log(`Fetching resources for courseId: ${courseId}`);
          const resourcesData = await fetchResources(courseId);
          console.log('Resources data received:', resourcesData);
          setResources(resourcesData.data || []);
        } catch (err: any) {
          console.error('Failed to fetch resources:', err?.message || err);
          console.error('Full error:', err);
          setResources([]);
        }
      } catch (err) {
        console.error('Failed to fetch course:', err);
        setError('Failed to load course details');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    try {
      setReviewFormLoading(true);
      setReviewFormError(null);

      const courseId = parseInt(id, 10);
      if (isNaN(courseId)) throw new Error('Invalid course ID');

      // Validate form
      if (!formData.review_text?.trim()) {
        setReviewFormError('Please write a review');
        return;
      }

      // Submit review
      await createReview(courseId, formData);

      // Refresh reviews list
      const updatedReviews = await fetchReviews(courseId);
      setReviews(updatedReviews.data || []);

      // Close form and reset
      setShowReviewForm(false);
      setFormData({
        quality: 5,
        difficulty: 3,
        workload_hours: 10,
        usefulness: 5,
        recommendation: 5,
        review_text: "",
        is_anonymous: false,
      });
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setReviewFormError(err?.message || 'Failed to submit review');
    } finally {
      setReviewFormLoading(false);
    }
  };

  const handleVoteReview = async (reviewId: number, isHelpful: boolean) => {
    try {
      // Just call the backend - it handles:
      // 1. Creating new vote if none exists
      // 2. Changing vote type if user votes differently
      // 3. Removing vote if user clicks same button again
      await voteReview(reviewId, isHelpful);

      // Refresh reviews list to get updated votes/counts
      const courseId = parseInt(id, 10);
      if (!isNaN(courseId)) {
        const updatedReviews = await fetchReviews(courseId);
        setReviews(updatedReviews.data || []);
      }
    } catch (err: any) {
      console.error('Failed to vote on review:', err);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    try {
      setQuestionFormLoading(true);
      setQuestionFormError(null);

      const courseId = parseInt(id, 10);
      if (isNaN(courseId)) throw new Error('Invalid course ID');

      // Validate form
      if (!questionFormData.title?.trim()) {
        setQuestionFormError('Please enter a question title');
        return;
      }
      if (!questionFormData.body?.trim()) {
        setQuestionFormError('Please write your question');
        return;
      }

      // Submit question
      await createQuestion(courseId, questionFormData);

      // Refresh questions list
      const updatedQuestions = await fetchQuestions(courseId);
      setQuestions(updatedQuestions.data || []);

      // Close form and reset
      setShowQuestionForm(false);
      setQuestionFormData({
        title: "",
        body: "",
      });
    } catch (err: any) {
      console.error('Failed to submit question:', err);
      setQuestionFormError(err?.message || 'Failed to submit question');
    } finally {
      setQuestionFormLoading(false);
    }
  };

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    try {
      setResourceFormLoading(true);
      setResourceFormError(null);

      const courseId = parseInt(id, 10);
      if (isNaN(courseId)) throw new Error('Invalid course ID');

      // Validate form
      if (!resourceFormData.title?.trim()) {
        setResourceFormError('Please enter a resource title');
        return;
      }

      const isExternalLink = resourceFormData.type === "EXTERNAL_LINK";

      // Validate required fields based on type
      if (isExternalLink) {
        if (!resourceFormData.link_url?.trim()) {
          setResourceFormError('Please provide an external link');
          return;
        }
      } else {
        if (!resourceFile && !resourceFormData.file_url?.trim()) {
          setResourceFormError('Please upload a file or provide a file URL');
          return;
        }
      }

      // Build payload - use FormData if file is uploaded, otherwise JSON
      let payload: any;
      let isFormData = false;

      if (resourceFile) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('type', resourceFormData.type);
        formData.append('title', resourceFormData.title);
        if (resourceFormData.description?.trim()) {
          formData.append('description', resourceFormData.description);
        }
        formData.append('file', resourceFile);
        payload = formData;
        isFormData = true;
      } else {
        // Use JSON for non-file uploads
        payload = {
          type: resourceFormData.type,
          title: resourceFormData.title,
        };

        if (resourceFormData.description?.trim()) {
          payload.description = resourceFormData.description;
        }

        // Add only the relevant field based on type
        if (isExternalLink) {
          payload.link_url = resourceFormData.link_url;
        } else if (resourceFormData.file_url?.trim()) {
          payload.file_url = resourceFormData.file_url;
        }
      }

      // Submit resource
      console.log('[CourseDetail] Resource type:', resourceFormData.type);
      console.log('[CourseDetail] Is FormData:', isFormData);
      console.log('[CourseDetail] Resource payload:', isFormData ? 'FormData' : JSON.stringify(payload, null, 2));
      await createResource(courseId, payload as CreateResourcePayload);

      // Refresh resources list
      const updatedResources = await fetchResources(courseId);
      setResources(updatedResources.data || []);

      // Close form and reset
      setShowResourceForm(false);
      setResourceFile(null);
      setResourceFormData({
        type: "NOTES",
        title: "",
        description: "",
        file_url: "",
        link_url: "",
      });
    } catch (err: any) {
      console.error('Failed to upload resource:', err);
      setResourceFormError(err?.message || 'Failed to upload resource');
    } finally {
      setResourceFormLoading(false);
    }
  };

  const handleVoteResource = async (resourceId: number, vote: "UP" | "DOWN") => {
    try {
      const currentVote = resourceVotes.get(resourceId);

      const newResourceVotes = new Map(resourceVotes);
      let optimisticResources = resources;

      // Calculate optimistic update
      optimisticResources = resources.map((resource) => {
        if (resource.id === resourceId) {
          // Undo vote if the same vote is clicked again
          if (currentVote === vote) {
            newResourceVotes.delete(resourceId);
            if (vote === "UP") {
              return { ...resource, upvotes: resource.upvotes - 1 };
            } else {
              return { ...resource, downvotes: resource.downvotes - 1 };
            }
          }

          // Switch vote type
          if (currentVote && currentVote !== vote) {
            newResourceVotes.set(resourceId, vote);
            if (vote === "UP") {
              return {
                ...resource,
                upvotes: resource.upvotes + 1,
                downvotes: Math.max(0, resource.downvotes - 1),
              };
            } else {
              return {
                ...resource,
                downvotes: resource.downvotes + 1,
                upvotes: Math.max(0, resource.upvotes - 1),
              };
            }
          }

          // Apply new vote
          newResourceVotes.set(resourceId, vote);
          if (vote === "UP") {
            return { ...resource, upvotes: resource.upvotes + 1 };
          } else {
            return { ...resource, downvotes: resource.downvotes + 1 };
          }
        }
        return resource;
      });

      // Optimistically update UI
      setResourceVotes(newResourceVotes);
      setResources(optimisticResources);

      // Send vote to backend and sync with response
      const updatedResource = await voteResource(resourceId, vote);

      // Update the specific resource with the server-persisted vote counts
      const syncedResources = resources.map((resource) =>
        resource.id === resourceId ? updatedResource : resource
      );
      setResources(syncedResources);
    } catch (err: any) {
      console.error('Failed to vote on resource:', err);
      // Revert optimistic update on error by reloading resources
      try {
        const courseId = parseInt(id, 10);
        if (!isNaN(courseId)) {
          const reloadedResources = await fetchResources(courseId);
          setResources(reloadedResources.data || []);
        }
      } catch (reloadErr) {
        console.error('Failed to reload resources after vote error:', reloadErr);
      }
    }
  };

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

        {showMockData && (
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-3">
            <p className="text-xs text-warning">Showing sample data. Live data coming soon.</p>
          </div>
        )}

        {/* Course Header Card */}
        <div className="rounded-2xl bg-card shadow-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {course.code}
            </span>
            <span className="text-xs text-muted-foreground">{course.department} · {course.credits} credits</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{course.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{course.review_count ?? course.reviewCount ?? 0} reviews</p>

          <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-surface">
            <Star className="h-6 w-6 text-warning fill-warning" />
            <span className="text-3xl font-bold text-foreground">{course.avg_quality ?? course.avgQuality ?? 0}</span>
            <span className="text-sm text-muted-foreground">/ 5</span>
          </div>
        </div>

        {/* Rating Breakdown */}
        <div className="rounded-2xl bg-card shadow-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Rating Breakdown</h3>
          <RatingBar label="Quality" value={course.avg_quality ?? course.avgQuality ?? 0} max={5} />
          <RatingBar label="Difficulty" value={course.avg_difficulty ?? course.avgDifficulty ?? 0} max={5} />
          <div className="flex items-center gap-3 w-full">
            <span className="w-20 text-xs text-muted-foreground">Workload</span>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{(course.avg_workload ?? course.avgWorkload ?? 0).toFixed(1)} hrs/week</span>
            </div>
          </div>
          <RatingBar label="Usefulness" value={course.avg_usefulness ?? course.avgUsefulness ?? 0} max={5} />
        </div>

        <Tabs defaultValue="reviews">
          <TabsList className="rounded-xl bg-surface p-1 w-full">
            <TabsTrigger value="reviews" className="flex-1 rounded-lg text-xs">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="questions" className="flex-1 rounded-lg text-xs">Q&A ({questions.length})</TabsTrigger>
            <TabsTrigger value="resources" className="flex-1 rounded-lg text-xs">Resources ({resources.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="space-y-3 mt-4">
            {reviews.length > 0 ? (
              <>
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl bg-card shadow-card p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn("h-3.5 w-3.5", i < review.quality ? "text-warning fill-warning" : "text-muted")}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {review.is_anonymous ? "Anonymous" : review.user?.display_name} · {review.created_at}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground leading-relaxed">{review.review_text}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <button 
                        onClick={() => handleVoteReview(review.id, true)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-success transition-colors"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        Helpful ({review.helpfulness_votes})
                      </button>
                      <button 
                        onClick={() => handleVoteReview(review.id, false)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <Button className="w-full rounded-xl h-11" onClick={() => setShowReviewForm(true)}>Write a Review</Button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
                <Button className="mt-4 rounded-xl" onClick={() => setShowReviewForm(true)}>Write a Review</Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="questions" className="space-y-3 mt-4">
            {questions.length > 0 ? (
              <>
                {questions.map((q) => (
                  <Link
                    key={q.id}
                    href={`/courses/${id}/questions/${q.id}`}
                    className="block rounded-2xl bg-card shadow-card p-4 cursor-pointer hover:shadow-card-hover transition-all"
                  >
                    <p className="text-sm font-medium text-foreground">{q.title}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{q.answer_count} answers</span>
                      <span>{q.view_count} views</span>
                      <span>{q.user?.display_name} · {q.created_at}</span>
                    </div>
                  </Link>
                ))}
                <Button className="w-full rounded-xl h-11" onClick={() => setShowQuestionForm(true)}>Ask a Question</Button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No questions yet. Ask one!</p>
                <Button className="mt-4 rounded-xl" onClick={() => setShowQuestionForm(true)}>Ask a Question</Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="resources" className="mt-4">
            {resources.length > 0 ? (
              <div className="space-y-3">
                {resources.map((resource) => (
                  <div key={resource.id} className="rounded-2xl bg-card shadow-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{resource.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {resource.type} · {resource.user?.display_name} · {resource.created_at}
                        </p>
                        {resource.description && (
                          <p className="text-xs text-foreground mt-2">{resource.description}</p>
                        )}
                        
                        {/* Resource Link */}
                        <div className="mt-3">
                          {resource.file_url ? (
                            <a
                              href={`/api/resources/${resource.id}/download`}
                              download
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              Download File
                            </a>
                          ) : resource.link_url ? (
                            <a
                              href={resource.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              Open Link
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() => handleVoteResource(resource.id, "UP")}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          resourceVotes.get(resource.id) === "UP"
                            ? "text-success"
                            : "text-muted-foreground hover:text-success"
                        }`}
                      >
                        <ThumbsUp className="h-3 w-3" />
                        {resource.upvotes}
                      </button>
                      <button
                        onClick={() => handleVoteResource(resource.id, "DOWN")}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          resourceVotes.get(resource.id) === "DOWN"
                            ? "text-destructive"
                            : "text-muted-foreground hover:text-destructive"
                        }`}
                      >
                        <ThumbsDown className="h-3 w-3" />
                        {resource.downvotes}
                      </button>
                    </div>
                  </div>
                ))}
                <Button className="w-full rounded-xl h-11" onClick={() => setShowResourceForm(true)}>Upload Resource</Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-card shadow-card py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">No resources yet</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to share!</p>
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setShowResourceForm(true)}>Upload Resource</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Write Review Form Dialog */}
        <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
              <DialogDescription>Share your experience with this course</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {reviewFormError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-xs text-destructive">{reviewFormError}</p>
                </div>
              )}

              {/* Quality Rating */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Quality: {formData.quality}</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({ ...formData, quality: rating })}
                      className={cn(
                        "flex-1 py-2 px-2 rounded-lg border transition-colors text-xs font-semibold",
                        formData.quality === rating
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-surface bg-surface text-foreground hover:border-primary/50"
                      )}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Rating */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Difficulty: {formData.difficulty}</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({ ...formData, difficulty: rating })}
                      className={cn(
                        "flex-1 py-2 px-2 rounded-lg border transition-colors text-xs font-semibold",
                        formData.difficulty === rating
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-surface bg-surface text-foreground hover:border-primary/50"
                      )}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              {/* Usefulness Rating */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Usefulness: {formData.usefulness}</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({ ...formData, usefulness: rating })}
                      className={cn(
                        "flex-1 py-2 px-2 rounded-lg border transition-colors text-xs font-semibold",
                        formData.usefulness === rating
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-surface bg-surface text-foreground hover:border-primary/50"
                      )}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendation Rating */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Recommendation: {formData.recommendation}</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({ ...formData, recommendation: rating })}
                      className={cn(
                        "flex-1 py-2 px-2 rounded-lg border transition-colors text-xs font-semibold",
                        formData.recommendation === rating
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-surface bg-surface text-foreground hover:border-primary/50"
                      )}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workload Hours */}
              <div className="space-y-2">
                <Label htmlFor="workload" className="text-xs font-semibold">
                  Weekly Workload (hours): {formData.workload_hours || "-"}
                </Label>
                <Input
                  id="workload"
                  type="number"
                  step="0.5"
                  min="0"
                  max="168"
                  placeholder="Enter hours (e.g., 10, 15.5)"
                  value={formData.workload_hours || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ 
                      ...formData, 
                      workload_hours: val === "" ? 0 : parseFloat(val) || 0 
                    });
                  }}
                  className="text-xs"
                />
              </div>

              {/* Review Text */}
              <div className="space-y-2">
                <Label htmlFor="review" className="text-xs font-semibold">
                  Your Review
                </Label>
                <Textarea
                  id="review"
                  placeholder="Share your experience with this course..."
                  value={formData.review_text || ""}
                  onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
                  className="text-xs min-h-[80px] rounded-lg"
                />
              </div>

              {/* Anonymous Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anonymous"
                  checked={formData.is_anonymous || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_anonymous: checked as boolean })}
                />
                <Label htmlFor="anonymous" className="text-xs cursor-pointer">
                  Post anonymously
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={reviewFormLoading}
                className="w-full rounded-lg"
              >
                {reviewFormLoading ? "Submitting..." : "Submit Review"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Ask Question Dialog */}
        <Dialog open={showQuestionForm} onOpenChange={setShowQuestionForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ask a Question</DialogTitle>
              <DialogDescription>Ask your classmates or instructors for help</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitQuestion} className="space-y-4">
              {questionFormError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-xs text-destructive">{questionFormError}</p>
                </div>
              )}

              {/* Question Title */}
              <div className="space-y-2">
                <Label htmlFor="question-title" className="text-xs font-semibold">
                  Question Title
                </Label>
                <Input
                  id="question-title"
                  placeholder="What's your question? (be specific and clear)"
                  value={questionFormData.title}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, title: e.target.value })}
                  className="text-xs"
                />
              </div>

              {/* Question Body */}
              <div className="space-y-2">
                <Label htmlFor="question-body" className="text-xs font-semibold">
                  Question Details
                </Label>
                <Textarea
                  id="question-body"
                  placeholder="Provide more context or details about your question..."
                  value={questionFormData.body}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, body: e.target.value })}
                  className="text-xs min-h-[100px] rounded-lg"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={questionFormLoading}
                className="w-full rounded-lg"
              >
                {questionFormLoading ? "Posting..." : "Post Question"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Upload Resource Dialog */}
        <Dialog 
          open={showResourceForm} 
          onOpenChange={(open) => {
            setShowResourceForm(open);
            if (open) {
              // Reset form when dialog opens
              setResourceFile(null);
              setResourceFormData({
                type: "NOTES",
                title: "",
                description: "",
                file_url: "",
                link_url: "",
              });
              setResourceFormError(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Resource</DialogTitle>
              <DialogDescription>Share helpful course materials with others</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUploadResource} className="space-y-4">
              {resourceFormError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-xs text-destructive">{resourceFormError}</p>
                </div>
              )}

              {/* Resource Type */}
              <div className="space-y-2">
                <Label htmlFor="resource-type" className="text-xs font-semibold">
                  Resource Type
                </Label>
                <select
                  id="resource-type"
                  value={resourceFormData.type}
                  onChange={(e) => {
                    const newType = e.target.value as CreateResourcePayload['type'];
                    // Reset form when type changes
                    setResourceFormData({
                      type: newType,
                      title: "",
                      description: "",
                      file_url: "",
                      link_url: "",
                    });
                    setResourceFile(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="NOTES">Class Notes</option>
                  <option value="PAST_ASSESSMENT">Past Assessment</option>
                  <option value="PROJECT_EXAMPLE">Project Example</option>
                  <option value="EXTERNAL_LINK">External Link</option>
                </select>
              </div>

              {/* Resource Title */}
              <div className="space-y-2">
                <Label htmlFor="resource-title" className="text-xs font-semibold">
                  Title *
                </Label>
                <Input
                  id="resource-title"
                  placeholder="e.g., Lecture 5 Notes"
                  value={resourceFormData.title}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, title: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>

              {/* Resource Description */}
              <div className="space-y-2">
                <Label htmlFor="resource-description" className="text-xs font-semibold">
                  Description
                </Label>
                <Textarea
                  id="resource-description"
                  placeholder="Briefly describe what this resource is about"
                  value={resourceFormData.description}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, description: e.target.value })}
                  className="text-xs min-h-[80px] rounded-lg"
                />
              </div>

              {/* Conditional Fields Based on Type */}
              {resourceFormData.type === "EXTERNAL_LINK" ? (
                <>
                  {/* External Link */}
                  <div className="space-y-2">
                    <Label htmlFor="link-url" className="text-xs font-semibold">
                      External Link *
                    </Label>
                    <Input
                      id="link-url"
                      placeholder="https://example.com"
                      value={resourceFormData.link_url}
                      onChange={(e) => setResourceFormData({ ...resourceFormData, link_url: e.target.value })}
                      className="text-xs"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="resource-file" className="text-xs font-semibold">
                      Upload File
                    </Label>
                    <input
                      id="resource-file"
                      type="file"
                      onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs text-foreground file:bg-primary file:text-primary-foreground file:px-3 file:py-1 file:rounded file:border-0 file:cursor-pointer"
                      accept=".pdf,.doc,.docx,.txt,.xlsx,.pptx,.zip"
                    />
                    {resourceFile && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {resourceFile.name} ({(resourceFile.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>

                  {/* File URL Alternative */}
                  <div className="space-y-2">
                    <Label htmlFor="file-url" className="text-xs font-semibold">
                      Or File URL
                    </Label>
                    <Input
                      id="file-url"
                      placeholder="https://example.com/file.pdf"
                      value={resourceFormData.file_url}
                      onChange={(e) => setResourceFormData({ ...resourceFormData, file_url: e.target.value })}
                      className="text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      {resourceFile ? "Using uploaded file" : "Provide a file URL or upload a file"}
                    </p>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={resourceFormLoading}
                className="w-full rounded-lg"
              >
                {resourceFormLoading ? "Uploading..." : "Upload Resource"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
