"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchQuestionDetail, type QuestionDetail, type CourseAnswer, createAnswer, voteAnswer, type CreateAnswerPayload, type VoteAnswerPayload } from "@/lib/services/qa";

export default function QuestionDetail() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const questionId = params.questionId as string;

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [answerBody, setAnswerBody] = useState("");
  const [answerVotes, setAnswerVotes] = useState<Map<number, "UPVOTE" | "DOWNVOTE">>(new Map());

  useEffect(() => {
    async function loadQuestionDetail() {
      try {
        setLoading(true);
        setError(null);

        const qId = parseInt(questionId, 10);
        if (isNaN(qId)) throw new Error("Invalid question ID");

        const questionData = await fetchQuestionDetail(qId);
        setQuestion(questionData);
      } catch (err: any) {
        console.error("Failed to load question detail:", err);
        setError(err?.message || "Failed to load question");
      } finally {
        setLoading(false);
      }
    }

    loadQuestionDetail();
  }, [questionId]);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;

    try {
      setAnswerLoading(true);
      setAnswerError(null);

      if (!answerBody.trim()) {
        setAnswerError("Please write an answer");
        return;
      }

      const qId = parseInt(questionId, 10);
      if (isNaN(qId)) throw new Error("Invalid question ID");

      const payload: CreateAnswerPayload = { body: answerBody };
      await createAnswer(qId, payload);

      // Refresh question detail
      const updatedQuestion = await fetchQuestionDetail(qId);
      setQuestion(updatedQuestion);

      // Reset form
      setShowAnswerForm(false);
      setAnswerBody("");
    } catch (err: any) {
      console.error("Failed to submit answer:", err);
      setAnswerError(err?.message || "Failed to submit answer");
    } finally {
      setAnswerLoading(false);
    }
  };

  const handleVoteAnswer = async (answerId: number, voteType: "UPVOTE" | "DOWNVOTE") => {
    if (!question) return;

    try {
      const qId = parseInt(questionId, 10);
      if (isNaN(qId)) throw new Error("Invalid question ID");

      const currentVote = answerVotes.get(answerId);

      const newVotes = new Map(answerVotes);
      let optimisticAnswers = question.answers;

      // Calculate optimistic update
      optimisticAnswers = question.answers.map((answer) => {
        if (answer.id === answerId) {
          // Undo vote if the same vote is clicked again
          if (currentVote === voteType) {
            newVotes.delete(answerId);
            if (voteType === "UPVOTE") {
              return { ...answer, upvotes: answer.upvotes - 1 };
            } else {
              return { ...answer, downvotes: answer.downvotes - 1 };
            }
          }

          // Switch vote type
          if (currentVote && currentVote !== voteType) {
            newVotes.set(answerId, voteType);
            if (voteType === "UPVOTE") {
              return {
                ...answer,
                upvotes: answer.upvotes + 1,
                downvotes: Math.max(0, answer.downvotes - 1),
              };
            } else {
              return {
                ...answer,
                downvotes: answer.downvotes + 1,
                upvotes: Math.max(0, answer.upvotes - 1),
              };
            }
          }

          // Apply new vote
          newVotes.set(answerId, voteType);
          if (voteType === "UPVOTE") {
            return { ...answer, upvotes: answer.upvotes + 1 };
          } else {
            return { ...answer, downvotes: answer.downvotes + 1 };
          }
        }
        return answer;
      });

      // Optimistically update UI
      setAnswerVotes(newVotes);
      setQuestion({ ...question, answers: optimisticAnswers });

      // Send vote to backend and sync with response
      const payload: VoteAnswerPayload = { vote_type: voteType };
      const updatedAnswer = await voteAnswer(qId, answerId, payload);

      // Update the specific answer with the server-persisted vote counts
      const syncedAnswers = question.answers.map((answer) =>
        answer.id === answerId ? updatedAnswer : answer
      );
      setQuestion({ ...question, answers: syncedAnswers });
    } catch (err: any) {
      console.error("Failed to vote on answer:", err);
      // Revert optimistic update on error by reloading question data
      try {
        const qId = parseInt(questionId, 10);
        if (!isNaN(qId)) {
          const reloadedQuestion = await fetchQuestionDetail(qId);
          setQuestion(reloadedQuestion);
        }
      } catch (reloadErr) {
        console.error("Failed to reload question after vote error:", reloadErr);
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
            <div className="h-4 w-full bg-surface rounded mb-2" />
            <div className="h-4 w-3/4 bg-surface rounded" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !question) {
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
          <div className="rounded-2xl bg-card shadow-card p-5">
            <p className="text-red-500 text-sm">{error || "Failed to load question"}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Question */}
        <div className="rounded-2xl bg-card shadow-card p-5 space-y-3">
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-bold text-foreground">{question.title}</h1>
            <div className="text-xs text-muted-foreground">
              {question.view_count} views
            </div>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{question.body}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{question.user?.display_name}</span>
            <span>{question.created_at}</span>
          </div>
        </div>

        {/* Answers Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Answers ({question.answers?.length || 0})
            </h2>
            <Button
              onClick={() => setShowAnswerForm(true)}
              className="rounded-xl"
              size="sm"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Post Answer
            </Button>
          </div>

          {question.answers && question.answers.length > 0 ? (
            <div className="space-y-3">
              {question.answers.map((answer) => (
                <div
                  key={answer.id}
                  className="rounded-2xl bg-card shadow-card p-4 border-l-4 border-primary"
                >
                  {answer.is_accepted && (
                    <div className="mb-2 inline-block rounded-full bg-success/20 px-2 py-1 text-xs font-semibold text-success">
                      ✓ Accepted Answer
                    </div>
                  )}
                  <p className="text-sm text-foreground leading-relaxed">{answer.body}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{answer.user?.display_name}</span>
                      <span>{answer.created_at}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVoteAnswer(answer.id, "UPVOTE")}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          answerVotes.get(answer.id) === "UPVOTE"
                            ? "text-success"
                            : "text-muted-foreground hover:text-success"
                        }`}
                      >
                        👍 {answer.upvotes}
                      </button>
                      <button
                        onClick={() => handleVoteAnswer(answer.id, "DOWNVOTE")}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          answerVotes.get(answer.id) === "DOWNVOTE"
                            ? "text-destructive"
                            : "text-muted-foreground hover:text-destructive"
                        }`}
                      >
                        👎 {answer.downvotes}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-card shadow-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No answers yet. Be the first to answer this question!
              </p>
            </div>
          )}
        </div>

        {/* Post Answer Dialog */}
        <Dialog open={showAnswerForm} onOpenChange={setShowAnswerForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Post an Answer</DialogTitle>
              <DialogDescription>Help others by sharing your answer</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              {answerError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-xs text-destructive">{answerError}</p>
                </div>
              )}

              {/* Answer Body */}
              <div className="space-y-2">
                <Label htmlFor="answer-body" className="text-xs font-semibold">
                  Your Answer
                </Label>
                <Textarea
                  id="answer-body"
                  placeholder="Write your answer here... Be clear and helpful"
                  value={answerBody}
                  onChange={(e) => setAnswerBody(e.target.value)}
                  className="text-xs min-h-[120px] rounded-lg"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={answerLoading}
                className="w-full rounded-lg"
              >
                {answerLoading ? "Posting..." : "Post Answer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
