import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import logo from "@/assets/vs-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL, isStaffOrAbove, useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/booking", label: "Booking" },
  { to: "/rules", label: "Rules" },
  { to: "/about", label: "About" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const { session, user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/" });
  };

  return (
    <div className="studio-backdrop relative min-h-screen text-foreground">
      {/* 4K Luxury Dark Wallpaper applied on every single page */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat opacity-60 sm:opacity-75 transition-opacity"
        style={{ backgroundImage: "url('/wallpaper.jpg')" }}
      />
      {/* Veil to preserve high contrast and legibility */}
      <div aria-hidden="true" className="wallpaper-veil pointer-events-none fixed inset-0 -z-10" />

      <header className="px-4 pt-4 sm:px-6">
        <nav className="glass-panel purple-glow animate-fade-up mx-auto flex max-w-7xl flex-wrap items-center gap-3 rounded-3xl px-4 py-3">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={logo.url}
              alt="Visual Studios logo"
              referrerPolicy="no-referrer"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full aspect-square border border-zinc-700/80 bg-black object-cover shadow-lg group-hover:scale-105 transition-transform shrink-0"
            />
            <span className="font-display text-base sm:text-lg font-bold uppercase tracking-[0.2em]">
              Visual Studios
            </span>
          </Link>

          <div className="glass-pill ml-auto flex flex-wrap items-center gap-1 p-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3.5 py-1.5 text-xs sm:text-sm text-muted-foreground transition hover:bg-primary/15 hover:text-foreground"
                activeProps={{ className: "bg-primary/25 text-foreground font-semibold" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}

            {isStaffOrAbove(role) && (
              <Link
                to="/panel"
                className="rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium text-primary transition hover:bg-primary/20 hover:text-foreground"
                activeProps={{ className: "bg-primary/30 text-foreground font-semibold" }}
              >
                Control Panel
              </Link>
            )}
          </div>

          {user || session ? (
            <div className="flex items-center gap-2">
              <span
                className={`hidden items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium sm:inline-flex ${
                  role === "chairman"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : role === "super_admin"
                      ? "border-red-500/40 bg-red-500/10 text-red-400"
                      : role === "admin"
                        ? "border-purple-500/40 bg-purple-500/10 text-purple-400"
                        : role === "staff"
                          ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                          : "border-glass-border bg-glass-highlight text-muted-foreground"
                }`}
              >
                {role === "chairman" ? (
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                ) : role === "super_admin" ? (
                  <Sparkles className="h-3.5 w-3.5 text-red-400" />
                ) : role === "admin" ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-orange-400" />
                )}
                {role ? ROLE_LABEL[role] : "Normal User"}
              </span>

              <Button variant="outline" size="sm" className="rounded-full" onClick={handleSignOut}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="rounded-full shadow-lg shadow-primary/20">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      {/* Global Footer featuring the exact Visual Studios Metallic Logo */}
      <footer className="mt-16 border-t border-zinc-900 bg-black/90 px-4 py-8 sm:px-6 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3.5">
            <img
              src={logo.url}
              alt="Visual Studios Logo"
              referrerPolicy="no-referrer"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-full aspect-square border border-zinc-700/80 bg-black object-cover shadow-lg shadow-black shrink-0"
            />
            <div>
              <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white">
                Visual Studios
              </span>
              <p className="text-[11px] text-zinc-500">
                Official Recording & Content Production Collective
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400">
            <Link to="/" className="hover:text-white transition">
              Home
            </Link>
            <Link to="/booking" className="hover:text-white transition">
              Booking
            </Link>
            <Link to="/about" className="hover:text-white transition">
              About
            </Link>
            <Link to="/rules" className="hover:text-white transition">
              Rules
            </Link>
            {isStaffOrAbove(role) && (
              <Link to="/analytics" className="hover:text-white transition">
                Staff Analytics
              </Link>
            )}
            {isStaffOrAbove(role) && (
              <Link to="/panel" className="hover:text-white transition">
                Control Panel
              </Link>
            )}
          </div>
        </div>
        <div className="mx-auto mt-6 max-w-7xl border-t border-zinc-900/80 pt-4 text-center text-[11px] text-zinc-600">
          © {new Date().getFullYear()} Visual Studios. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
