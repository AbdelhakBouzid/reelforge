import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/utils";
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
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
};

function tone(status: string): "neutral" | "success" | "warn" | "danger" {
  if (status === "succeeded") return "success";
  if (status === "failed") return "danger";
  return "neutral";
}

export function AdminPaymentsPage() {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin-payments", page],
    queryFn: () => apiRequest<Response>(`/admin/payments?page=${page}`, { auth: true }),
  });

  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / (query.data?.pageSize ?? 25)));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin - Payments</h1>
      <div className="space-y-3">
        {query.data?.items.map((payment) => (
          <Card key={payment.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{formatCurrency(payment.amount, payment.currency)}</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">
                User {payment.userId} • {formatDate(payment.createdAt)}
              </p>
            </div>
            <Badge tone={tone(payment.status)}>{payment.status}</Badge>
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