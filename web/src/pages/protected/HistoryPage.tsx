import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api";
import type { GenerationListResponse } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

const pageSize = 10;

function tone(status: string): "neutral" | "success" | "warn" | "danger" {
  if (status === "succeeded") return "success";
  if (status === "failed") return "danger";
  if (status === "processing") return "warn";
  return "neutral";
}

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    return params.toString();
  }, [page, status, type]);

  const listQuery = useQuery({
    queryKey: ["generations-history", page, type, status],
    queryFn: () => apiRequest<GenerationListResponse>(`/generations?${queryString}`, { auth: true }),
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Generation History</h1>
        <select className="rf-input w-36" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All types</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
        <select className="rf-input w-36" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="queued">Queued</option>
          <option value="processing">Processing</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {listQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : null}

      {listQuery.data?.items.length === 0 ? (
        <EmptyState title="No history yet" description="Run your first generation to fill this timeline." />
      ) : null}

      <div className="space-y-3">
        {listQuery.data?.items.map((item) => (
          <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">{item.prompt}</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">{formatDate(item.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{item.type}</Badge>
              <Badge tone={tone(item.status)}>{item.status}</Badge>
              <Badge>{item.costCredits} credits</Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
          Previous
        </Button>
        <span className="text-sm text-[rgb(var(--text-muted))]">
          Page {page} / {totalPages}
        </span>
        <Button variant="ghost" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
}