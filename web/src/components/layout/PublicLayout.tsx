import { Link, NavLink, Outlet } from "react-router-dom";
import { Film, MoonStar, Sun, Wallet } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/Button";

const links = [
  { to: "/", label: "Home" },
  { to: "/pricing", label: "Pricing" },
];

export function PublicLayout() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgb(var(--bg))]/80 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="rounded-xl bg-[rgb(var(--primary))]/20 p-2 text-[rgb(var(--primary))]">
              <Film className="h-5 w-5" />
            </span>
            ReelForge
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm transition ${
                    isActive ? "bg-white/10 text-white" : "text-[rgb(var(--text-muted))] hover:bg-white/10"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={toggleTheme} className="p-2">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            </Button>
            {isAuthenticated ? (
              <Link to="/dashboard" className="rf-btn-primary">
                <Wallet className="h-4 w-4" />
                Dashboard
              </Link>
            ) : (
              <Link to="/auth/signin" className="rf-btn-primary">
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="mx-auto mt-12 w-full max-w-6xl border-t border-white/10 px-4 py-8 text-sm text-[rgb(var(--text-muted))] sm:px-6">
        <p>ReelForge - AI image and reel generation SaaS.</p>
      </footer>
    </div>
  );
}