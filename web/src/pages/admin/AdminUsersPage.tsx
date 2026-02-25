import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";

type UsersResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    id: string;
    email: string;
    name: string | null;
    role: "user" | "admin";
    credits: number;
    createdAt: string;
  }>;
};

export function AdminUsersPage() {
  const [page, setPage] = useState(1);

  const usersQuery = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => apiRequest<UsersResponse>(`/admin/users?page=${page}`, { auth: true }),
  });

  const totalPages = Math.max(1, Math.ceil((usersQuery.data?.total ?? 0) / (usersQuery.data?.pageSize ?? 25)));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin - Users</h1>

      {usersQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : null}

      <div className="space-y-3">
        {usersQuery.data?.items.map((user) => (
          <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{user.name || user.email}</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">{user.email}</p>
              <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Joined {formatDate(user.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{user.role}</Badge>
              <Badge>Credits {user.credits}</Badge>
            </div>
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