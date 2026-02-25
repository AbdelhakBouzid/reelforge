import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, ShieldCheck, TriangleAlert } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import type { CatalogResponse } from "../../lib/types";
import { formatCurrency } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";

const planDisplayPrice: Record<string, number> = {
  starter: 19,
  pro: 49,
  scale: 129,
};

export function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const processedReturnRef = useRef(false);
  const { subscription, refreshMe } = useAuth();
  const { pushToast } = useToast();

  const catalogQuery = useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiRequest<CatalogResponse>("/catalog"),
  });

  const checkoutMutation = useMutation({
    mutationFn: (payload: { kind: "subscription"; planId: string } | { kind: "pack"; packId: string }) =>
      apiRequest<{ url: string | null }>("/paypal/create-checkout-session", {
        method: "POST",
        auth: true,
        body: payload,
      }),
    onSuccess: async ({ url }) => {
      await refreshMe();
      if (url) {
        window.location.href = url;
        return;
      }

      pushToast({ type: "error", title: "Checkout unavailable", message: "PayPal did not return an approval URL." });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to open PayPal checkout.";
      pushToast({ type: "error", title: "Checkout failed", message });
    },
  });

  const captureOrderMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiRequest<{ success: boolean }>("/paypal/capture-order", {
        method: "POST",
        auth: true,
        body: { orderId },
      }),
    onSuccess: async () => {
      await refreshMe();
      pushToast({ type: "success", title: "Payment captured", message: "Credits have been added to your account." });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to capture PayPal order.";
      pushToast({ type: "error", title: "Capture failed", message });
    },
  });

  const activateSubscriptionMutation = useMutation({
    mutationFn: (subscriptionId: string) =>
      apiRequest<{ success: boolean }>("/paypal/activate-subscription", {
        method: "POST",
        auth: true,
        body: { subscriptionId },
      }),
    onSuccess: async () => {
      await refreshMe();
      pushToast({
        type: "success",
        title: "Subscription activated",
        message: "Your monthly credits are now active.",
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to activate PayPal subscription.";
      pushToast({ type: "error", title: "Activation failed", message });
    },
  });

  useEffect(() => {
    if (processedReturnRef.current) return;

    const kind = searchParams.get("kind");
    const orderToken = searchParams.get("token");
    const subscriptionId = searchParams.get("subscription_id");
    const paypalState = searchParams.get("paypal");

    if (paypalState === "cancel") {
      processedReturnRef.current = true;
      pushToast({ type: "error", title: "Checkout canceled", message: "Payment was canceled by the customer." });
      searchParams.delete("paypal");
      setSearchParams(searchParams, { replace: true });
      return;
    }

    if (kind === "pack" && orderToken) {
      processedReturnRef.current = true;
      captureOrderMutation.mutate(orderToken);
      searchParams.delete("token");
      searchParams.delete("PayerID");
      searchParams.delete("kind");
      searchParams.delete("paypal");
      setSearchParams(searchParams, { replace: true });
      return;
    }

    if (kind === "subscription" && subscriptionId) {
      processedReturnRef.current = true;
      activateSubscriptionMutation.mutate(subscriptionId);
      searchParams.delete("subscription_id");
      searchParams.delete("ba_token");
      searchParams.delete("kind");
      searchParams.delete("paypal");
      setSearchParams(searchParams, { replace: true });
    }
  }, [
    activateSubscriptionMutation,
    captureOrderMutation,
    pushToast,
    searchParams,
    setSearchParams,
  ]);

  const isCheckoutBusy =
    checkoutMutation.isPending || captureOrderMutation.isPending || activateSubscriptionMutation.isPending;
  const paypalEnabled = catalogQuery.data?.paypalEnabled ?? false;
  const aiProvider = catalogQuery.data?.aiProvider ?? "mock";

  const startSubscriptionCheckout = (planId: string, paypalPlanId: string | null) => {
    if (!paypalEnabled) {
      pushToast({
        type: "error",
        title: "PayPal not configured",
        message: "Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Vercel first.",
      });
      return;
    }

    if (!paypalPlanId) {
      pushToast({
        type: "error",
        title: "Plan ID missing",
        message: "This plan is not linked to a PayPal Plan ID yet.",
      });
      return;
    }

    checkoutMutation.mutate({ kind: "subscription", planId });
  };

  const startPackCheckout = (packId: string) => {
    if (!paypalEnabled) {
      pushToast({
        type: "error",
        title: "PayPal not configured",
        message: "Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Vercel first.",
      });
      return;
    }

    checkoutMutation.mutate({ kind: "pack", packId });
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">Billing & Payments</h1>
            <Badge tone={paypalEnabled ? "success" : "danger"}>
              {paypalEnabled ? "PayPal Active" : "PayPal Not Configured"}
            </Badge>
            <Badge tone={aiProvider === "replicate" ? "success" : "warn"}>
              AI: {aiProvider === "replicate" ? "Live Provider" : "Mock Provider"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">
            Secure PayPal checkout, recurring plans, and one-time credit packs for scale spikes.
          </p>

          {subscription ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="success">Subscription active</Badge>
              <Badge>Status: {subscription.status}</Badge>
              <Badge>Plan ID: {subscription.planId}</Badge>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[rgb(var(--text-muted))]">No active subscription yet.</p>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold">Payment Methods</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Checkout is hosted by PayPal for secure cards and wallets processing.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge>PayPal</Badge>
            <Badge>Visa</Badge>
            <Badge>Mastercard</Badge>
            <Badge>Apple Pay</Badge>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-sm text-[rgb(var(--text-muted))]">
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Customer redirected to official PayPal approval page
            </p>
            <p className="mt-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[rgb(var(--primary))]" />
              Manage profile details from your account page
            </p>
          </div>
          <Link to="/account" className="rf-link text-sm">
            Update billing profile
          </Link>
        </Card>
      </section>

      {!paypalEnabled ? (
        <Card className="border-amber-300/40 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-200" />
            <div>
              <h3 className="font-semibold text-amber-100">Enable PayPal to start receiving payments</h3>
              <p className="mt-1 text-sm text-amber-100/90">
                Add <code>PAYPAL_CLIENT_ID</code>, <code>PAYPAL_CLIENT_SECRET</code>, <code>PAYPAL_RETURN_URL</code>,
                and <code>PAYPAL_CANCEL_URL</code> in Vercel Environment Variables.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {catalogQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : null}

      <section>
        <h2 className="text-2xl font-bold">Subscription Plans</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {catalogQuery.data?.plans.map((plan, index) => {
            const normalized = plan.name.toLowerCase();
            const monthlyPrice = planDisplayPrice[normalized] ?? [19, 49, 129][index] ?? 29;
            const disabled = !paypalEnabled || !plan.stripePriceId;

            return (
              <Card
                key={plan.id}
                className={`flex h-full flex-col gap-4 ${index === 1 ? "border-[rgb(var(--primary))]/60" : ""}`}
              >
                {index === 1 ? (
                  <span className="self-start rounded-full bg-[rgb(var(--primary))]/20 px-3 py-1 text-xs font-bold text-[rgb(var(--primary))]">
                    Most Popular
                  </span>
                ) : null}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-3xl font-extrabold">
                  ${monthlyPrice}
                  <span className="ml-1 text-sm font-semibold text-[rgb(var(--text-muted))]">/month</span>
                </p>
                <p className="text-sm text-[rgb(var(--text-muted))]">
                  {plan.monthlyCredits} credits • around {Math.floor(plan.monthlyCredits / 5)} reels
                </p>
                <div className="space-y-2 text-sm text-[rgb(var(--text-muted))]">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    Monthly credit refill
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    Generation history and dashboard
                  </p>
                </div>
                <Button
                  className="mt-auto w-full"
                  disabled={disabled}
                  onClick={() => startSubscriptionCheckout(plan.id, plan.stripePriceId)}
                  loading={isCheckoutBusy}
                >
                  {disabled ? "Unavailable (Configure PayPal Plan ID)" : "Subscribe with PayPal"}
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">One-Time Credit Packs</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {catalogQuery.data?.packs.map((pack) => (
            <Card key={pack.id} className="flex h-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{pack.name}</h3>
                <Badge>{pack.credits} credits</Badge>
              </div>
              <p className="text-2xl font-extrabold">{formatCurrency(pack.price)}</p>
              <p className="text-sm text-[rgb(var(--text-muted))]">
                Ideal for temporary demand spikes or extra reels for campaigns.
              </p>
              <Button
                className="mt-auto w-full"
                variant="ghost"
                disabled={!paypalEnabled}
                onClick={() => startPackCheckout(pack.id)}
                loading={isCheckoutBusy}
              >
                {!paypalEnabled ? "Unavailable (Configure PayPal)" : "Pay with PayPal"}
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

