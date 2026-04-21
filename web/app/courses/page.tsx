"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import {
  Search,
  Star,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchCourses, type Course } from "@/lib/services/courses";

const mockCourses: Course[] = [
  { id: 1, code: "INFO 653", title: "Web Development III", department: "SDT", credits: 3, avgDifficulty: 3.8, avgQuality: 4.5, avgWorkload: 4.0, avgUsefulness: 4.7, reviewCount: 24 },
  { id: 2, code: "CS 201", title: "Data Structures & Algorithms", department: "SDT", credits: 3, avgDifficulty: 4.2, avgQuality: 4.0, avgWorkload: 4.5, avgUsefulness: 4.8, reviewCount: 42 },
  { id: 3, code: "MATH 301", title: "Linear Algebra", department: "SAS", credits: 3, avgDifficulty: 4.5, avgQuality: 3.8, avgWorkload: 3.5, avgUsefulness: 4.0, reviewCount: 18 },
  { id: 4, code: "ENG 102", title: "Academic Writing II", department: "SAS", credits: 3, avgDifficulty: 2.5, avgQuality: 3.5, avgWorkload: 3.0, avgUsefulness: 3.2, reviewCount: 31 },
  { id: 5, code: "CS 305", title: "Database Systems", department: "SDT", credits: 3, avgDifficulty: 3.5, avgQuality: 4.2, avgWorkload: 3.8, avgUsefulness: 4.6, reviewCount: 27 },
  { id: 6, code: "BUS 201", title: "Principles of Management", department: "SBA", credits: 3, avgDifficulty: 2.0, avgQuality: 3.0, avgWorkload: 2.5, avgUsefulness: 3.0, reviewCount: 15 },
];

export default function Courses() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchCourses({ page: 1 });
        setCourses(result.data || mockCourses);
      } catch (err) {
        console.error('Failed to fetch courses:', err);
        setError('Failed to load courses. Using sample data.');
        setCourses(mockCourses);
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  const filtered = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.department.toLowerCase().includes(search.toLowerCase())
  );

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

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-card shadow-card p-4 animate-pulse">
                <div className="h-11 w-11 rounded-xl bg-surface" />
                <div className="flex-1">
                  <div className="h-3 w-20 rounded bg-surface mb-2" />
                  <div className="h-4 w-40 rounded bg-surface mb-2" />
                  <div className="h-3 w-32 rounded bg-surface" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length > 0 ? (
              filtered.map((course) => (
                <div
                  key={course.id}
                  onClick={() => router.push(`/courses/${course.id}`)}
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
                        {course.avg_quality ?? course.avgQuality ?? 0}
                      </span>
                      <span>{course.review_count ?? course.reviewCount ?? 0} reviews</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-card shadow-card py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">No courses found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
