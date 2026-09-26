import { type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, User, ChevronDown } from "lucide-react";

import logo from "@/assets/vs-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <nav className="glass-panel animate-fade-up mx-auto flex max-w-7xl flex-wrap items-center gap-3 rounded-3xl px-4 py-3">
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
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="group flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/70 p-1 pr-3 hover:border-white/25 hover:bg-zinc-900/90 transition focus:outline-none focus:ring-1 focus:ring-white/20 shadow-sm"
                  >
                    <Avatar className="h-8 w-8 border border-white/15 bg-zinc-900 shrink-0">
                      <AvatarImage
                        src={user?.avatar_url}
                        alt={user?.display_name || "Player"}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-zinc-800 text-xs font-bold text-zinc-200">
                        {(user?.display_name || user?.email || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="hidden sm:flex flex-col text-left text-xs leading-tight">
                      <span className="font-semibold text-white max-w-[110px] truncate">
                        {user?.display_name || "Player"}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {role ? ROLE_LABEL[role] : "Player"}
                      </span>
                    </div>

                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-white transition ml-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border border-white/10 bg-zinc-950/95 p-1.5 text-foreground backdrop-blur-2xl shadow-2xl"
                >
                  <DropdownMenuLabel className="p-2 text-xs">
                    <p className="font-semibold text-white truncate">
                      {user?.display_name || "Player"}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-400 truncate">{user?.email}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="rounded-full bg-zinc-800/80 border border-white/10 px-2.5 py-0.5 text-[9px] font-mono text-zinc-300 font-medium">
                        Role: {role ? ROLE_LABEL[role] : "Player"}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild>
                    <Link
                      to="/account"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 hover:text-white cursor-pointer focus:bg-white/10 focus:text-white transition"
                    >
                      <User className="h-4 w-4 text-zinc-400" />
                      <span className="font-medium">Account Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer focus:bg-rose-500/20 focus:text-rose-300 transition"
                  >
                    <LogOut className="h-4 w-4 text-rose-400" />
                    <span className="font-medium">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
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
