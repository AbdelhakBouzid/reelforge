import { ArrowRight, Brush, Coins, Sparkles, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";

const galleryItems = [
  "https://picsum.photos/seed/reelforge-city/640/420",
  "https://picsum.photos/seed/reelforge-neon/640/420",
  "https://picsum.photos/seed/reelforge-mountain/640/420",
];

export function LandingPage() {
  return (
    <div className="space-y-10">
      <section className="rf-card overflow-hidden p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-[rgb(var(--text-muted))]">
              <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
              AI Creative Studio
            </p>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
              Forge stunning AI images and short reels in minutes
            </h1>
            <p className="max-w-xl text-[rgb(var(--text-muted))]">
              ReelForge gives creators and teams a credit-based pipeline for visual content generation with
              subscription options, billing, and history tracking.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/auth/signup" className="rf-btn-primary">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/pricing" className="rf-btn-ghost">
                View Pricing
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Card className="col-span-2 bg-gradient-to-br from-[rgb(var(--primary))]/20 to-cyan-500/10">
              <p className="text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">Credit Costs</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-xs text-[rgb(var(--text-muted))]">Image</p>
                  <p className="text-xl font-bold">1 credit</p>
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-xs text-[rgb(var(--text-muted))]">Video</p>
                  <p className="text-xl font-bold">5 credits</p>
                </div>
              </div>
            </Card>
            <Card>
              <Brush className="h-6 w-6 text-[rgb(var(--primary))]" />
              <p className="mt-3 text-sm">Prompt to image with instant previews</p>
            </Card>
            <Card>
              <Video className="h-6 w-6 text-[rgb(var(--primary))]" />
              <p className="mt-3 text-sm">Short reel generation and download</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <Coins className="h-6 w-6 text-[rgb(var(--primary))]" />
          <h3 className="mt-3 text-lg font-bold">Flexible Credits</h3>
          <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
            Mix subscription monthly credits with one-time pack purchases.
          </p>
        </Card>
        <Card>
          <Sparkles className="h-6 w-6 text-[rgb(var(--primary))]" />
          <h3 className="mt-3 text-lg font-bold">Generation Pipeline</h3>
          <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
            Track queued, processing, and final output states with history controls.
          </p>
        </Card>
        <Card>
          <Video className="h-6 w-6 text-[rgb(var(--primary))]" />
          <h3 className="mt-3 text-lg font-bold">Production Ready</h3>
          <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
            Built for Vercel serverless deployment, PayPal billing, and Prisma PostgreSQL.
          </p>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Example Gallery</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {galleryItems.map((image) => (
            <img key={image} src={image} alt="Generated sample" className="h-60 w-full rounded-2xl object-cover" />
          ))}
        </div>
      </section>
    </div>
  );
}