import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  MoreVertical,
  Share2,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mockItems } from "../data";

const statusChip: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  APPROVED: "bg-primary text-primary-foreground",
  CLAIMED: "bg-info/10 text-info",
  RESOLVED: "bg-muted text-muted-foreground",
};

const valueChip: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-muted text-foreground",
  HIGH: "bg-warning/10 text-warning",
  VERY_HIGH: "bg-warning text-warning-foreground",
};

const valueLabel: Record<string, string> = {
  LOW: "Low Value",
  MEDIUM: "Medium Value",
  HIGH: "High Value",
  VERY_HIGH: "Very High Value",
};

export default async function LostFoundItemDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = mockItems.find((entry) => entry.id === Number(id));

  if (!item) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-12">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/lost-found"
              aria-label="Back to lost and found"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-extrabold text-primary">Lost &amp; Found</h1>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-accent"
              aria-label="Share item"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-accent"
              aria-label="More actions"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <section className="relative h-[220px] w-full overflow-hidden bg-muted">
        <Image src={item.photoUrl} alt={item.title} fill priority className="object-cover" />
        <div className="absolute right-4 top-4">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
              statusChip[item.status]
            )}
          >
            {item.status}
          </span>
        </div>
      </section>

      <div className="relative -mt-4 space-y-4 px-4">
        <section className="rounded-3xl bg-card p-6 shadow-card">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h2 className="text-[2rem] leading-none font-extrabold tracking-tight text-primary">
              {item.title}
            </h2>
            <span
              className={cn(
                "shrink-0 rounded-lg px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
                valueChip[item.valueTier]
              )}
            >
              {valueLabel[item.valueTier]}
            </span>
          </div>

          <div className="mb-6 flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">Found in {item.location}</span>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-muted p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Reported By
              </p>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <p className="text-sm font-bold">{item.reportedBy}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-muted p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Found Date
              </p>
              <p className="text-sm font-bold text-foreground">{item.foundDate}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Item Description
            </h3>
            <p className="text-base leading-relaxed text-foreground/85">{item.description}</p>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground">
          <div className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-white/5 blur-2xl" />
          <div className="relative z-10">
            <h3 className="mb-1 text-4xl font-extrabold tracking-tight">Is this yours?</h3>
            <p className="mb-5 text-sm text-primary-foreground/85">
              To claim this item, you&apos;ll need to provide verification details to the campus security office.
            </p>
            <Button className="h-14 w-full rounded-2xl bg-warning text-warning-foreground hover:bg-warning/90">
              <ShieldCheck className="mr-2 h-5 w-5" />
              Claim This Item
            </Button>
          </div>
        </section>

        <section className="px-2 pt-1">
          <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Status History
          </h3>

          <div className="space-y-0">
            <TimelineRow
              title="Reported"
              subtitle={`${item.foundDate} • ${item.location}`}
              active
              continuation
            />
            <TimelineRow
              title="Approved"
              subtitle="Pending moderator verification"
              active={item.status !== "PENDING"}
              continuation
            />
            <TimelineRow
              title="Claimed"
              subtitle="Pending ownership proof"
              active={item.status === "CLAIMED" || item.status === "RESOLVED"}
              continuation
            />
            <TimelineRow
              title="Resolved"
              subtitle="Item returned to owner"
              active={item.status === "RESOLVED"}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function TimelineRow({
  title,
  subtitle,
  active,
  continuation = false,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  continuation?: boolean;
}) {
  return (
    <div className="flex min-h-[68px] gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "h-3 w-3 rounded-full",
            active ? "bg-success shadow-[0_0_0_4px_hsl(var(--success)/0.2)]" : "bg-border"
          )}
        />
        {continuation ? (
          <div className={cn("h-full w-0.5", active ? "bg-success/30" : "bg-border")} />
        ) : null}
      </div>

      <div className="pb-5">
        <p className={cn("text-2xl font-bold", active ? "text-foreground" : "text-muted-foreground")}>
          {title}
        </p>
        <p
          className={cn(
            "text-sm",
            active ? "text-muted-foreground" : "italic text-muted-foreground"
          )}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
