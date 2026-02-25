import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
import type { CatalogResponse } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";

export function PricingPage() {
  const catalogQuery = useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiRequest<CatalogResponse>("/catalog"),
  });

  if (catalogQuery.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
    );
  }

  if (catalogQuery.isError || !catalogQuery.data) {
    return (
      <Card>
        <p className="text-sm">Unable to load pricing right now. Please try again shortly.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Subscription plans plus one-time credit boosts.</p>
      </div>

      <section>
        <h2 className="text-xl font-bold">Monthly Plans</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {catalogQuery.data.plans.map((plan) => (
            <Card key={plan.id} className="flex h-full flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <Badge>{plan.monthlyCredits} credits</Badge>
                </div>
                <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">
                  Ideal for creators needing predictable monthly output.
                </p>
              </div>
              <Link to="/auth/signup" className="rf-btn-primary">
                Select Plan
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Credit Packs</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {catalogQuery.data.packs.map((pack) => (
            <Card key={pack.id} className="flex h-full flex-col justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">{pack.name}</h3>
                <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{pack.credits} one-time credits</p>
                <p className="mt-3 text-xl font-bold">{formatCurrency(pack.price)}</p>
              </div>
              <Link to="/auth/signup" className="rf-btn-primary">
                Buy Pack
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}