import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CreditCard,
  Film,
  Gauge,
  History,
  ImageIcon,
  LayoutGrid,
  LogOut,
  MoonStar,
  Settings,
  Shield,
  Sun,
  Video,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

const primaryLinks = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/generate/image", label: "Generate Image", icon: ImageIcon },
  { to: "/generate/video", label: "Generate Video", icon: Video },
  { to: "/history", label: "History", icon: History },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/account", label: "Account", icon: Settings },
];

const adminLinks = [
  { to: "/admin/users", label: "Users", icon: LayoutGrid },
  { to: "/admin/generations", label: "Generations", icon: Film },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/plans", label: "Plans", icon: Shield },
  { to: "/admin/packs", label: "Packs", icon: Shield },
];

export function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  const { user, credits, signOut, isAdmin } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-white/10 bg-[rgb(var(--bg-soft))]/70 p-5 backdrop-blur lg:block">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2 text-xl font-bold">
          <span className="rounded-xl bg-[rgb(var(--primary))]/20 p-2 text-[rgb(var(--primary))]">
            <Film className="h-5 w-5" />
          </span>
          ReelForge
        </Link>

        <div className="mb-3 text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">Workspace</div>
        <nav className="space-y-1">
          {primaryLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    isActive ? "bg-[rgb(var(--primary))]/20 text-white" : "text-[rgb(var(--text-muted))] hover:bg-white/10"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        {isAdmin ? (
          <>
            <div className="mb-3 mt-7 text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">Admin</div>
            <nav className="space-y-1">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                        isActive
                          ? "bg-amber-500/20 text-amber-100"
                          : "text-[rgb(var(--text-muted))] hover:bg-white/10"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </NavLink>
                );
              })}
            </nav>
          </>
        ) : null}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgb(var(--bg))]/80 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[rgb(var(--text-muted))]">Welcome back</p>
              <p className="text-sm font-semibold">{user?.name || user?.email}</p>
            </div>

            <div className="flex items-center gap-2">
              <Badge>Credits: {credits}</Badge>
              <Button variant="ghost" onClick={toggleTheme} className="p-2">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" onClick={() => void signOut()} className="p-2">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-8">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-white/15 bg-[rgb(var(--bg-soft))]/95 px-2 py-2 backdrop-blur lg:hidden">
          {primaryLinks.slice(0, 5).map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium ${
                  active ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--text-muted))]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label.replace("Generate ", "")}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}