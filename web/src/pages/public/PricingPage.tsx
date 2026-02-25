import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import type { CatalogResponse, Plan } from "../../lib/types";
import { formatCurrency } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";

const planMarketing: Record<
  string,
  {
    price: number;
    subtitle: string;
    badge?: string;
    points: string[];
  }
> = {
  starter: {
    price: 19,
    subtitle: "Perfect for solo creators launching daily short content.",
    points: ["Fast queue", "Up to 120 image generations", "Up to 24 reel generations"],
  },
  pro: {
    price: 49,
    subtitle: "Best value for agencies and teams producing client campaigns.",
    badge: "Most Popular",
    points: ["Priority queue", "Up to 500 image generations", "Up to 100 reel generations"],
  },
  scale: {
    price: 129,
    subtitle: "Built for high-volume businesses with weekly launches.",
    badge: "Studio",
    points: ["Premium queue", "Up to 2000 image generations", "Up to 400 reel generations"],
  },
};

function resolvePlanMeta(plan: Plan, index: number) {
  const byName = planMarketing[plan.name.toLowerCase()];
  if (byName) return byName;

  const fallbackPrice = [19, 49, 129][index] ?? Math.max(15, Math.round(plan.monthlyCredits / 15));

  return {
    price: fallbackPrice,
    subtitle: "Flexible monthly credits for AI images and short reel generation.",
    points: ["Creator dashboard", `${plan.monthlyCredits} monthly credits`, "Credit carry-over support via packs"],
  };
}

export function PricingPage() {
  const catalogQuery = useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiRequest<CatalogResponse>("/catalog"),
  });

  if (catalogQuery.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
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

  const { plans, packs, paypalEnabled, aiProvider } = catalogQuery.data;

  return (
    <div className="space-y-8">
      <section className="rf-card overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-[rgb(var(--text-muted))]">
              <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
              Flexible billing for creators and agencies
            </p>
            <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Simple plans. Clear credits. Fast checkout.</h1>
            <p className="mt-3 max-w-2xl text-sm text-[rgb(var(--text-muted))]">
              Choose a monthly plan for predictable output, then boost with one-time credit packs whenever client
              demand spikes.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone={paypalEnabled ? "success" : "danger"}>
                {paypalEnabled ? "PayPal checkout enabled" : "PayPal not configured yet"}
              </Badge>
              <Badge tone={aiProvider === "replicate" ? "success" : "warn"}>
                AI Provider: {aiProvider === "replicate" ? "Replicate (Live)" : "Mock (Demo)"}
              </Badge>
            </div>
          </div>
          <Card className="bg-black/15">
            <h3 className="text-lg font-bold">Generation Costs</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-[rgb(var(--text-muted))]">Image</p>
                <p className="text-2xl font-extrabold">1 credit</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-[rgb(var(--text-muted))]">Video Reel</p>
                <p className="text-2xl font-extrabold">5 credits</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {!paypalEnabled ? (
        <Card className="border-amber-300/40 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-200" />
            <div>
              <h3 className="font-semibold text-amber-100">Checkout is disabled until PayPal keys are added</h3>
              <p className="mt-1 text-sm text-amber-100/90">
                Add <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_CLIENT_SECRET</code> in Vercel Environment Variables
                to enable live payments.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <section>
        <h2 className="text-2xl font-bold">Monthly Plans</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const meta = resolvePlanMeta(plan, index);
            const estimatedReels = Math.floor(plan.monthlyCredits / 5);
            const isPopular = meta.badge?.toLowerCase().includes("popular");

            return (
              <Card
                key={plan.id}
                className={`relative flex h-full flex-col gap-4 ${
                  isPopular ? "border-[rgb(var(--primary))]/60 shadow-glow" : ""
                }`}
              >
                {meta.badge ? (
                  <span className="absolute -top-3 right-4 rounded-full bg-[rgb(var(--primary))] px-3 py-1 text-xs font-bold text-white">
                    {meta.badge}
                  </span>
                ) : null}

                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">{meta.subtitle}</p>
                </div>

                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-3xl font-extrabold">
                    ${meta.price}
                    <span className="ml-1 text-sm font-semibold text-[rgb(var(--text-muted))]">/month</span>
                  </p>
                  <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                    {plan.monthlyCredits} credits - around {estimatedReels} short reels
                  </p>
                </div>

                <ul className="space-y-2 text-sm text-[rgb(var(--text-muted))]">
                  {meta.points.map((point) => (
                    <li key={point} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-300" />
                      {point}
                    </li>
                  ))}
                </ul>

                <Link to="/auth/signup" className="mt-auto rf-btn-primary w-full">
                  Start with {plan.name}
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Credit Packs</h2>
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
          Great for campaign spikes, product launches, and seasonal workloads.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {packs.map((pack) => {
            const estimatedReels = Math.floor(pack.credits / 5);
            const creditValue = (pack.price / Math.max(pack.credits, 1)).toFixed(2);

            return (
              <Card key={pack.id} className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{pack.name}</h3>
                  <Badge>{pack.credits} credits</Badge>
                </div>
                <p className="text-3xl font-extrabold">{formatCurrency(pack.price)}</p>
                <div className="rounded-xl bg-white/5 p-3 text-sm text-[rgb(var(--text-muted))]">
                  <p>Estimated reels: {estimatedReels}</p>
                  <p>Cost per credit: ${creditValue}</p>
                </div>
                <Link to="/auth/signup" className="mt-auto rf-btn-ghost w-full">
                  Buy Pack
                </Link>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}