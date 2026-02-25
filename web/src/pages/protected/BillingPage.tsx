import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import type { CatalogResponse } from "../../lib/types";
import { formatCurrency } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";

export function BillingPage() {
  const { subscription, refreshMe } = useAuth();
  const { pushToast } = useToast();

  const catalogQuery = useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiRequest<CatalogResponse>("/catalog"),
  });

  const checkoutMutation = useMutation({
    mutationFn: (payload: { kind: "subscription"; planId: string } | { kind: "pack"; packId: string }) =>
      apiRequest<{ url: string | null }>("/stripe/create-checkout-session", {
        method: "POST",
        auth: true,
        body: payload,
      }),
    onSuccess: async ({ url }) => {
      await refreshMe();
      if (url) {
        window.location.href = url;
      } else {
        pushToast({ type: "error", title: "Checkout unavailable", message: "Stripe did not return a checkout URL." });
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to open checkout.";
      pushToast({ type: "error", title: "Checkout failed", message });
    },
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Manage your subscription and buy extra credits.</p>
          {subscription ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="success">Subscription active</Badge>
              <Badge>Plan ID: {subscription.planId}</Badge>
              <Badge>Status: {subscription.status}</Badge>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[rgb(var(--text-muted))]">No active subscription.</p>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Invoices</h2>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">
            Invoice portal can be connected from Stripe customer portal.
          </p>
          <Link to="/account" className="mt-3 inline-flex text-sm rf-link">
            Update account details
          </Link>
        </Card>
      </section>

      {catalogQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : null}

      <section>
        <h2 className="text-xl font-bold">Subscription Plans</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {catalogQuery.data?.plans.map((plan) => (
            <Card key={plan.id} className="space-y-3">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-sm text-[rgb(var(--text-muted))]">{plan.monthlyCredits} credits / month</p>
              <Button
                className="w-full"
                onClick={() => checkoutMutation.mutate({ kind: "subscription", planId: plan.id })}
                loading={checkoutMutation.isPending}
              >
                Subscribe
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Credit Packs</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {catalogQuery.data?.packs.map((pack) => (
            <Card key={pack.id} className="space-y-3">
              <h3 className="text-lg font-semibold">{pack.name}</h3>
              <p className="text-sm text-[rgb(var(--text-muted))]">{pack.credits} credits</p>
              <p className="text-lg font-bold">{formatCurrency(pack.price)}</p>
              <Button
                className="w-full"
                onClick={() => checkoutMutation.mutate({ kind: "pack", packId: pack.id })}
                loading={checkoutMutation.isPending}
              >
                Buy credits
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}