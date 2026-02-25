import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, PlusCircle, WandSparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import type { GenerationListResponse } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";

function statusTone(status: string): "neutral" | "success" | "warn" | "danger" {
  if (status === "succeeded") return "success";
  if (status === "failed") return "danger";
  if (status === "processing") return "warn";
  return "neutral";
}

export function DashboardPage() {
  const { credits } = useAuth();

  const recentQuery = useQuery({
    queryKey: ["recent-generations"],
    queryFn: () => apiRequest<GenerationListResponse>("/generations?page=1", { auth: true }),
  });

  const recentItems = useMemo(() => recentQuery.data?.items.slice(0, 6) ?? [], [recentQuery.data]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="sm:col-span-2">
          <p className="text-sm text-[rgb(var(--text-muted))]">Credit balance</p>
          <p className="mt-2 text-4xl font-extrabold">{credits}</p>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Image: 1 credit, Video: 5 credits</p>
        </Card>
        <Card>
          <p className="text-sm text-[rgb(var(--text-muted))]">Quick Action</p>
          <Link to="/generate/image" className="mt-3 rf-btn-primary w-full">
            <WandSparkles className="h-4 w-4" />
            Generate Image
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-[rgb(var(--text-muted))]">Need more credits?</p>
          <Link to="/billing" className="mt-3 rf-btn-primary w-full">
            <PlusCircle className="h-4 w-4" />
            Open Billing
          </Link>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent generations</h2>
          <Link to="/history" className="rf-link text-sm">
            View all
          </Link>
        </div>

        {recentQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : null}

        {recentItems.length === 0 && !recentQuery.isLoading ? (
          <EmptyState title="No generations yet" description="Start by generating your first image or video." />
        ) : null}

        <div className="space-y-3">
          {recentItems.map((item) => (
            <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.prompt}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatDate(item.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{item.type}</Badge>
                <Badge tone={statusTone(item.status)}>{item.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}