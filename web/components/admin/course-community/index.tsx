"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  Download,
  ExternalLink,
  FileStack,
  Loader2,
  MessageSquare,
  Pin,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchAdminCommunitySummary,
  fetchAdminQuestionDetail,
  fetchAdminQuestions,
  fetchAdminResources,
  fetchAdminReviews,
  type AdminCommunitySummary,
  type AdminQuestionModerationDetail,
  type AdminQuestionModerationItem,
  type AdminResourceModerationItem,
  type AdminReviewModerationItem,
} from "@/lib/services/admin-course-community";
import { deleteAnswer, deleteQuestion, pinQuestion } from "@/lib/services/qa";
import { deleteResource, updateResourceStatus } from "@/lib/services/resources";
import { deleteReview, updateReviewStatus } from "@/lib/services/reviews";

type CommunityTab = "reviews" | "resources" | "questions";
type ModerationStatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
type QuestionStateFilter = "ALL" | "OPEN" | "PINNED" | "CLOSED";
type ResourceTypeFilter =
  | "ALL"
  | "NOTES"
  | "PAST_ASSESSMENT"
  | "EXTERNAL_LINK"
  | "PROJECT_EXAMPLE";

const TAB_OPTIONS: Array<{
  key: CommunityTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "reviews", label: "Reviews", icon: BookOpenText },
  { key: "resources", label: "Resources", icon: FileStack },
  { key: "questions", label: "Q&A", icon: MessageSquare },
];

const EMPTY_PAGINATED = {
  data: [],
  total: 0,
  page: 1,
  pageSize: 20,
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadgeClass(status: string) {
  if (status === "APPROVED") return "border-success/20 bg-success/10 text-success";
  if (status === "REJECTED") return "border-destructive/20 bg-destructive/10 text-destructive";
  if (status === "OPEN") return "border-primary/20 bg-primary/10 text-primary";
  if (status === "CLOSED") return "border-muted-foreground/20 bg-muted text-muted-foreground";
  return "border-warning/20 bg-warning/10 text-warning";
}

function emptyLabelForTab(tab: CommunityTab) {
  if (tab === "reviews") return "No reviews match these filters.";
  if (tab === "resources") return "No resources match these filters.";
  return "No questions match these filters.";
}

export function CourseCommunityWorkspace() {
  const [tab, setTab] = useState<CommunityTab>("reviews");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ModerationStatusFilter>("PENDING");
  const [resourceStatus, setResourceStatus] = useState<ModerationStatusFilter>("PENDING");
  const [resourceType, setResourceType] = useState<ResourceTypeFilter>("ALL");
  const [questionState, setQuestionState] = useState<QuestionStateFilter>("OPEN");
  const [summary, setSummary] = useState<AdminCommunitySummary | null>(null);
  const [reviews, setReviews] = useState<{
    data: AdminReviewModerationItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(EMPTY_PAGINATED);
  const [resources, setResources] = useState<{
    data: AdminResourceModerationItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(EMPTY_PAGINATED);
  const [questions, setQuestions] = useState<{
    data: AdminQuestionModerationItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(EMPTY_PAGINATED);
  const [questionDetail, setQuestionDetail] = useState<AdminQuestionModerationDetail | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentList = tab === "reviews" ? reviews : tab === "resources" ? resources : questions;
  const totalPages = Math.max(1, Math.ceil(currentList.total / Math.max(1, currentList.pageSize)));
  const selectedReview = tab === "reviews" ? reviews.data.find((item) => item.id === selectedId) ?? null : null;
  const selectedResource = tab === "resources" ? resources.data.find((item) => item.id === selectedId) ?? null : null;
  const selectedQuestion = tab === "questions" ? questions.data.find((item) => item.id === selectedId) ?? null : null;

  const summaryCards = useMemo(() => {
    if (!summary) return [];

    return [
      {
        title: "Pending Reviews",
        value: summary.reviews.pending,
        note: `${summary.reviews.total} total review submissions`,
      },
      {
        title: "Pending Resources",
        value: summary.resources.pending,
        note: `${summary.resources.total} total shared resources`,
      },
      {
        title: "Open Questions",
        value: summary.questions.openQuestions,
        note: `${summary.questions.pinnedQuestions} pinned across courses`,
      },
      {
        title: "Answers Posted",
        value: summary.questions.totalAnswers,
        note: `${summary.questions.totalQuestions} total questions tracked`,
      },
    ];
  }, [summary]);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setIsRefreshingSummary(true);
      try {
        const response = await fetchAdminCommunitySummary();
        if (!cancelled) {
          setSummary(response);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load moderation summary");
        }
      } finally {
        if (!cancelled) {
          setIsRefreshingSummary(false);
        }
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
    setSelectedId(null);
    setQuestionDetail(null);
    setActionError(null);
  }, [tab, search, reviewStatus, resourceStatus, resourceType, questionState]);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentTab = async () => {
      setIsLoadingList(true);
      setLoadError(null);

      try {
        if (tab === "reviews") {
          const response = await fetchAdminReviews({
            page,
            search: search.trim() || undefined,
            status: reviewStatus === "ALL" ? undefined : reviewStatus,
          });
          if (!cancelled) {
            setReviews(response);
          }
        } else if (tab === "resources") {
          const response = await fetchAdminResources({
            page,
            search: search.trim() || undefined,
            status: resourceStatus === "ALL" ? undefined : resourceStatus,
            type: resourceType === "ALL" ? undefined : resourceType,
          });
          if (!cancelled) {
            setResources(response);
          }
        } else {
          const response = await fetchAdminQuestions({
            page,
            search: search.trim() || undefined,
            state: questionState,
          });
          if (!cancelled) {
            setQuestions(response);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load moderation items");
          if (tab === "reviews") setReviews(EMPTY_PAGINATED);
          if (tab === "resources") setResources(EMPTY_PAGINATED);
          if (tab === "questions") setQuestions(EMPTY_PAGINATED);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      }
    };

    void loadCurrentTab();
    return () => {
      cancelled = true;
    };
  }, [page, questionState, resourceStatus, resourceType, reviewStatus, search, tab]);

  useEffect(() => {
    if (tab !== "questions" || selectedId === null) {
      setQuestionDetail(null);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setIsLoadingDetail(true);
      setActionError(null);
      try {
        const response = await fetchAdminQuestionDetail(selectedId);
        if (!cancelled) {
          setQuestionDetail(response);
        }
      } catch (error) {
        if (!cancelled) {
          setActionError(error instanceof Error ? error.message : "Failed to load question detail");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDetail(false);
        }
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId, tab]);

  async function refreshSummaryAndList() {
    setIsRefreshingSummary(true);
    try {
      const response = await fetchAdminCommunitySummary();
      setSummary(response);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to refresh moderation summary");
    } finally {
      setIsRefreshingSummary(false);
    }

    setIsLoadingList(true);
    try {
      if (tab === "reviews") {
        const response = await fetchAdminReviews({
          page,
          search: search.trim() || undefined,
          status: reviewStatus === "ALL" ? undefined : reviewStatus,
        });
        setReviews(response);
      } else if (tab === "resources") {
        const response = await fetchAdminResources({
          page,
          search: search.trim() || undefined,
          status: resourceStatus === "ALL" ? undefined : resourceStatus,
          type: resourceType === "ALL" ? undefined : resourceType,
        });
        setResources(response);
      } else {
        const response = await fetchAdminQuestions({
          page,
          search: search.trim() || undefined,
          state: questionState,
        });
        setQuestions(response);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to refresh moderation list");
    } finally {
      setIsLoadingList(false);
    }
  }

  async function handleReviewAction(action: "approve" | "reject" | "delete", reviewId: number) {
    setIsWorking(true);
    setActionError(null);
    try {
      if (action === "approve") {
        await updateReviewStatus(reviewId, "APPROVED");
      } else if (action === "reject") {
        await updateReviewStatus(reviewId, "REJECTED");
      } else {
        if (!window.confirm("Delete this review permanently?")) return;
        await deleteReview(reviewId);
      }

      setSelectedId(null);
      await refreshSummaryAndList();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update review");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleResourceAction(action: "approve" | "reject" | "delete", resourceId: number) {
    setIsWorking(true);
    setActionError(null);
    try {
      if (action === "approve") {
        await updateResourceStatus(resourceId, "APPROVED");
      } else if (action === "reject") {
        await updateResourceStatus(resourceId, "REJECTED");
      } else {
        if (!window.confirm("Delete this resource permanently?")) return;
        await deleteResource(resourceId);
      }

      setSelectedId(null);
      await refreshSummaryAndList();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update resource");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleQuestionPin(nextPinned: boolean) {
    if (!questionDetail) return;

    setIsWorking(true);
    setActionError(null);
    try {
      await pinQuestion(questionDetail.id, nextPinned);
      const [detail] = await Promise.all([
        fetchAdminQuestionDetail(questionDetail.id),
        refreshSummaryAndList(),
      ]);
      setQuestionDetail(detail);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update question");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    if (!window.confirm("Delete this question and all of its answers?")) return;

    setIsWorking(true);
    setActionError(null);
    try {
      await deleteQuestion(questionId);
      setSelectedId(null);
      setQuestionDetail(null);
      await refreshSummaryAndList();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete question");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDeleteAnswer(answerId: number) {
    if (!questionDetail) return;
    if (!window.confirm("Delete this answer permanently?")) return;

    setIsWorking(true);
    setActionError(null);
    try {
      await deleteAnswer(answerId);
      const [detail] = await Promise.all([
        fetchAdminQuestionDetail(questionDetail.id),
        refreshSummaryAndList(),
      ]);
      setQuestionDetail(detail);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete answer");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <AdminShell active="course-reviews" title="Course Community Moderation">
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.title} className="rounded-2xl border-0 shadow-card">
              <CardHeader className="pb-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{card.title}</p>
                <CardTitle className="text-4xl font-extrabold tracking-tight text-foreground">
                  {isRefreshingSummary ? "..." : card.value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{card.note}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-2xl bg-card p-4 shadow-card">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex w-full flex-wrap rounded-xl bg-muted p-1 xl:w-auto">
              {TAB_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = option.key === tab;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setTab(option.key)}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                      isActive ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-[240px] flex-1 md:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search course, author, or content..."
                  className="h-10 rounded-xl bg-muted/60 pl-9"
                />
              </div>

              {tab === "reviews" && (
                <select
                  value={reviewStatus}
                  onChange={(event) => setReviewStatus(event.target.value as ModerationStatusFilter)}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              )}

              {tab === "resources" && (
                <>
                  <select
                    value={resourceStatus}
                    onChange={(event) => setResourceStatus(event.target.value as ModerationStatusFilter)}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <select
                    value={resourceType}
                    onChange={(event) => setResourceType(event.target.value as ResourceTypeFilter)}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="ALL">All resource types</option>
                    <option value="NOTES">Notes</option>
                    <option value="PAST_ASSESSMENT">Past Assessments</option>
                    <option value="EXTERNAL_LINK">External Links</option>
                    <option value="PROJECT_EXAMPLE">Project Examples</option>
                  </select>
                </>
              )}

              {tab === "questions" && (
                <select
                  value={questionState}
                  onChange={(event) => setQuestionState(event.target.value as QuestionStateFilter)}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="ALL">All questions</option>
                  <option value="OPEN">Open</option>
                  <option value="PINNED">Pinned</option>
                  <option value="CLOSED">Closed</option>
                </select>
              )}
            </div>
          </div>
        </section>

        {loadError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {actionError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {actionError}
          </div>
        )}

        <section className={cn("grid grid-cols-1 gap-4", selectedId !== null && "xl:grid-cols-[minmax(0,1fr)_26rem]")}>
          <Card className="rounded-2xl border-0 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {tab === "reviews" ? "Review Queue" : tab === "resources" ? "Resource Queue" : "Question Queue"}
                </p>
                <CardTitle className="mt-1 text-xl font-bold text-primary">
                  {currentList.total} {tab === "reviews" ? "reviews" : tab === "resources" ? "resources" : "questions"}
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void refreshSummaryAndList()} disabled={isLoadingList || isWorking}>
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingList ? (
                <div className="flex min-h-[24rem] items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading moderation items...
                </div>
              ) : currentList.data.length === 0 ? (
                <div className="flex min-h-[24rem] items-center justify-center px-6 text-sm text-muted-foreground">
                  {emptyLabelForTab(tab)}
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {tab === "reviews" &&
                    reviews.data.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          "w-full px-5 py-4 text-left transition-colors hover:bg-muted/40",
                          selectedId === item.id && "bg-muted/50"
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-foreground">
                                {item.course.code}
                              </span>
                              <Badge className={statusBadgeClass(item.status)}>{item.status}</Badge>
                              {item.is_anonymous && <Badge variant="secondary">Anonymous</Badge>}
                            </div>
                            <p className="text-sm font-semibold text-foreground">{item.course.title}</p>
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {item.review_text?.trim() || "No written comment provided."}
                            </p>
                          </div>
                          <div className="space-y-1 text-right text-xs text-muted-foreground">
                            <p>{item.user.display_name}</p>
                            <p>{formatDateTime(item.created_at)}</p>
                            <p>{item.helpfulness_votes} helpful votes</p>
                          </div>
                        </div>
                      </button>
                    ))}

                  {tab === "resources" &&
                    resources.data.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          "w-full px-5 py-4 text-left transition-colors hover:bg-muted/40",
                          selectedId === item.id && "bg-muted/50"
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-foreground">{item.title}</span>
                              <Badge className={statusBadgeClass(item.status)}>{item.status}</Badge>
                              <Badge variant="secondary">{item.type.replaceAll("_", " ")}</Badge>
                            </div>
                            <p className="text-sm text-foreground">{item.course.code} · {item.course.title}</p>
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {item.description?.trim() || "No description provided."}
                            </p>
                          </div>
                          <div className="space-y-1 text-right text-xs text-muted-foreground">
                            <p>{item.user.display_name}</p>
                            <p>{formatDateTime(item.created_at)}</p>
                            <p>{item.upvotes} up / {item.downvotes} down</p>
                          </div>
                        </div>
                      </button>
                    ))}

                  {tab === "questions" &&
                    questions.data.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          "w-full px-5 py-4 text-left transition-colors hover:bg-muted/40",
                          selectedId === item.id && "bg-muted/50"
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-foreground">{item.title}</span>
                              {item.is_pinned && <Badge className={statusBadgeClass("PINNED")}>PINNED</Badge>}
                              <Badge className={statusBadgeClass(item.is_closed ? "CLOSED" : "OPEN")}>
                                {item.is_closed ? "CLOSED" : "OPEN"}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground">{item.course.code} · {item.course.title}</p>
                            <p className="line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
                          </div>
                          <div className="space-y-1 text-right text-xs text-muted-foreground">
                            <p>{item.user.display_name}</p>
                            <p>{formatDateTime(item.updated_at)}</p>
                            <p>{item.answer_count} answers · {item.view_count} views</p>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border/60 px-5 py-4 text-sm">
                <p className="text-muted-foreground">
                  Page {currentList.page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isLoadingList}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isLoadingList}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedId !== null && (
            <Card className="rounded-2xl border-0 shadow-card">
              <CardHeader className="border-b border-border/60">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Detail Panel</p>
                <CardTitle className="text-xl font-bold text-primary">
                  {tab === "reviews"
                    ? "Review Moderation"
                    : tab === "resources"
                    ? "Resource Moderation"
                    : "Question Moderation"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {tab === "reviews" && selectedReview && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusBadgeClass(selectedReview.status)}>{selectedReview.status}</Badge>
                      {selectedReview.is_anonymous && <Badge variant="secondary">Anonymous to students</Badge>}
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-foreground">{selectedReview.course.code} · {selectedReview.course.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Submitted by {selectedReview.user.display_name} · {formatDateTime(selectedReview.created_at)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Difficulty</p>
                        <p className="mt-1 font-semibold">{selectedReview.difficulty}/5</p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Workload</p>
                        <p className="mt-1 font-semibold">{selectedReview.workload_hours} hrs</p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Quality</p>
                        <p className="mt-1 font-semibold">{selectedReview.quality}/5</p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Usefulness</p>
                        <p className="mt-1 font-semibold">{selectedReview.usefulness}/5</p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3 col-span-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Recommendation</p>
                        <p className="mt-1 font-semibold">{selectedReview.recommendation}/5 · {selectedReview.helpfulness_votes} helpful votes</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Review Text</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {selectedReview.review_text?.trim() || "No written review was included."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedReview.status !== "APPROVED" && (
                        <Button onClick={() => void handleReviewAction("approve", selectedReview.id)} disabled={isWorking}>
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      {selectedReview.status !== "REJECTED" && (
                        <Button variant="secondary" onClick={() => void handleReviewAction("reject", selectedReview.id)} disabled={isWorking}>
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      )}
                      <Button variant="destructive" onClick={() => void handleReviewAction("delete", selectedReview.id)} disabled={isWorking}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </>
                )}

                {tab === "resources" && selectedResource && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusBadgeClass(selectedResource.status)}>{selectedResource.status}</Badge>
                      <Badge variant="secondary">{selectedResource.type.replaceAll("_", " ")}</Badge>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-foreground">{selectedResource.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedResource.course.code} · {selectedResource.course.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Shared by {selectedResource.user.display_name} · {formatDateTime(selectedResource.created_at)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Description</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {selectedResource.description?.trim() || "No description was included."}
                      </p>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Votes</p>
                        <p className="mt-1 font-semibold">{selectedResource.upvotes} upvotes · {selectedResource.downvotes} downvotes</p>
                      </div>
                      {selectedResource.link_url && (
                        <a
                          href={selectedResource.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-3 py-3 text-sm font-medium text-primary hover:bg-muted/40"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open external link
                        </a>
                      )}
                      {selectedResource.file_url && (
                        <a
                          href={`/api/resources/${selectedResource.id}/download`}
                          className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-3 py-3 text-sm font-medium text-primary hover:bg-muted/40"
                        >
                          <Download className="h-4 w-4" />
                          Download uploaded file
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedResource.status !== "APPROVED" && (
                        <Button onClick={() => void handleResourceAction("approve", selectedResource.id)} disabled={isWorking}>
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      {selectedResource.status !== "REJECTED" && (
                        <Button variant="secondary" onClick={() => void handleResourceAction("reject", selectedResource.id)} disabled={isWorking}>
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      )}
                      <Button variant="destructive" onClick={() => void handleResourceAction("delete", selectedResource.id)} disabled={isWorking}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </>
                )}

                {tab === "questions" && (
                  <>
                    {isLoadingDetail && (
                      <div className="flex min-h-[18rem] items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading question detail...
                      </div>
                    )}

                    {!isLoadingDetail && questionDetail && (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {questionDetail.is_pinned && <Badge className={statusBadgeClass("PINNED")}>PINNED</Badge>}
                          <Badge className={statusBadgeClass(questionDetail.is_closed ? "CLOSED" : "OPEN")}>
                            {questionDetail.is_closed ? "CLOSED" : "OPEN"}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-foreground">{questionDetail.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {questionDetail.course.code} · {questionDetail.course.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Posted by {questionDetail.user.display_name} · {formatDateTime(questionDetail.created_at)}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="rounded-xl bg-muted/50 p-3">
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Views</p>
                            <p className="mt-1 font-semibold">{questionDetail.view_count}</p>
                          </div>
                          <div className="rounded-xl bg-muted/50 p-3">
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Answers</p>
                            <p className="mt-1 font-semibold">{questionDetail.answer_count}</p>
                          </div>
                          <div className="rounded-xl bg-muted/50 p-3">
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Updated</p>
                            <p className="mt-1 font-semibold">{formatDateTime(questionDetail.updated_at)}</p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Question Body</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{questionDetail.body}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => void handleQuestionPin(!questionDetail.is_pinned)} disabled={isWorking}>
                            <Pin className="h-4 w-4" />
                            {questionDetail.is_pinned ? "Unpin Question" : "Pin Question"}
                          </Button>
                          <Button variant="destructive" onClick={() => void handleDeleteQuestion(questionDetail.id)} disabled={isWorking}>
                            <Trash2 className="h-4 w-4" />
                            Delete Question
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">Answers</p>
                            <Badge variant="outline">{questionDetail.answers.length}</Badge>
                          </div>

                          {questionDetail.answers.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                              No answers on this thread yet.
                            </div>
                          ) : (
                            questionDetail.answers.map((answer) => (
                              <div key={answer.id} className="rounded-xl border border-border/60 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-foreground">{answer.user.display_name}</p>
                                      {answer.is_accepted && <Badge className="border-success/20 bg-success/10 text-success">Accepted</Badge>}
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{answer.body}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {answer.upvotes} upvotes · {answer.downvotes} downvotes · {formatDateTime(answer.created_at)}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => void handleDeleteAnswer(answer.id)}
                                    disabled={isWorking}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}

                    {!isLoadingDetail && !questionDetail && selectedQuestion && (
                      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                        Select a question again to load its moderation details.
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
