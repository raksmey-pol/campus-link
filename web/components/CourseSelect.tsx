"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type CourseOption = {
  id: number;
  code: string;
  title: string;
};

// 🔌 connect to your backend
async function fetchCourseOptions(query: string): Promise<CourseOption[]> {
  const url = query
    ? `/api/courses?q=${encodeURIComponent(query)}`
    : `/api/courses`; // fallback

  const res = await fetch(url);
  const data = await res.json();
  return data.data ?? data;
}

export function CourseSelect({
  value,
  onChange,
  placeholder,
}: {
  value?: number;
  onChange: (id: number) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CourseOption | null>(null);

  useEffect(() => {
    if (!value) return setSelected(null);
    const found = courses.find((c) => c.id === value);
    if (found) setSelected(found);
  }, [value, courses]);

  const handleSearch = async (q: string) => {
    setLoading(true);
    try {
      const results = await fetchCourseOptions(q);
      setCourses(results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
        handleSearch(""); // empty query = load initial data
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between rounded-xl">
          <span className="truncate">
            {selected
              ? `${selected.code} — ${selected.title}`
              : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder="Search course..."
            onValueChange={(v) => void handleSearch(v)}
          />
          <CommandList className="max-h-60 overflow-y-auto scroll-smooth py-1">
            <CommandEmpty>
              {loading ? "Searching..." : "No results"}
            </CommandEmpty>
            <CommandGroup>
              {courses.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.code} ${c.title}`}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === c.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium">{c.code}</span>
                  <span className="ml-2 text-muted-foreground">
                    {c.title}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}