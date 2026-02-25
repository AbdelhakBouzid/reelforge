import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

type Response = {
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    id: string;
    userId: string;
    type: "image" | "video";
    status: "queued" | "processing" | "succeeded" | "failed";
    prompt: string;
    costCredits: number;
    createdAt: string;
  }>;
};

function statusTone(status: string): "neutral" | "success" | "warn" | "danger" {
  if (status === "succeeded") return "success";
  if (status === "failed") return "danger";
  if (status === "processing") return "warn";
  return "neutral";
}

export function AdminGenerationsPage() {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin-generations", page],
    queryFn: () => apiRequest<Response>(`/admin/generations?page=${page}`, { auth: true }),
  });

  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / (query.data?.pageSize ?? 25)));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin - Generations</h1>
      <div className="space-y-3">
        {query.data?.items.map((item) => (
          <Card key={item.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">{item.prompt}</p>
              <div className="flex items-center gap-2">
                <Badge>{item.type}</Badge>
                <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                <Badge>{item.costCredits} credits</Badge>
              </div>
            </div>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              User {item.userId} • {formatDate(item.createdAt)}
            </p>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
          Prev
        </Button>
        <span className="text-sm text-[rgb(var(--text-muted))]">
          {page}/{totalPages}
        </span>
        <Button variant="ghost" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
}