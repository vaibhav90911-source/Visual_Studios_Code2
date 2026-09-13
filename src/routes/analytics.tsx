import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, ShieldCheck } from "lucide-react";

import logo from "@/assets/vs-logo.png.asset.json";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { isStaffOrAbove, useAuth, ROLE_LABEL } from "@/lib/auth";
import { StaffAnalyticsManager } from "@/components/StaffAnalyticsManager";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Staff Analytics & VC Tracking — Visual Studios" },
      {
        name: "description",
        content:
          "Monitor staff activity, voice channel duration, message statistics, and server work contributions for Visual Studios.",
      },
      { property: "og:title", content: "Staff Analytics & VC Tracking — Visual Studios" },
      {
        property: "og:description",
        content:
          "Monitor staff activity, voice channel duration, message statistics, and server work contributions for Visual Studios.",
      },
    ],
  }),
  component: StaffAnalyticsPage,
});

function StaffAnalyticsPage() {
  const { role, user, loading } = useAuth();

  if (loading) {
    return (
      <SiteLayout>
        <main className="animate-fade-up mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-24 sm:px-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Verifying clearance...</span>
          </div>
        </main>
      </SiteLayout>
    );
  }

  // Strict restriction: Normal players cannot view staff analytics without clearance
  if (!isStaffOrAbove(role)) {
    return (
      <SiteLayout>
        <main className="animate-fade-up-late mx-auto flex max-w-xl flex-col px-4 py-16 sm:px-6">
          <div className="glass-panel purple-glow rounded-3xl p-8 text-center sm:p-10 border border-zinc-800 bg-black/95">
            <div className="flex flex-col items-center justify-center gap-3">
              <img
                src={logo.url}
                alt="Visual Studios Logo"
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-full aspect-square border border-zinc-700/80 bg-black object-cover shadow-xl shadow-black shrink-0"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-purple-400">
                <Lock className="h-6 w-6" />
              </div>
            </div>

            <h1 className="mt-5 font-display text-2xl font-bold uppercase tracking-widest text-white sm:text-3xl">
              Staff Clearance Required
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Staff analytics, Discord user IDs, voice channel duration, and server work metrics are
              confidential and cannot be viewed by normal players.
            </p>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-400">
              {user ? (
                <p>
                  Signed in as <strong className="text-white">{user.email}</strong> (
                  <span
                    className={`font-semibold ${
                      user.role === "super_admin"
                        ? "text-red-400"
                        : user.role === "admin"
                          ? "text-purple-400"
                          : user.role === "staff"
                            ? "text-orange-400"
                            : "text-zinc-300"
                    }`}
                  >
                    {ROLE_LABEL[user.role]}
                  </span>
                  ). Click below to upgrade clearance as a Visual Studios staff member or Founder.
                </p>
              ) : (
                <p>
                  Please authenticate with your verified Founder, Manager, or Recording Team account
                  to unlock the live analytics dashboard.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Button
                asChild
                className="rounded-full bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-600/30"
              >
                <Link to="/auth">
                  <ShieldCheck className="mr-1.5 h-4 w-4 text-emerald-400" />
                  Sign In with Staff Account
                </Link>
              </Button>
            </div>

            <div className="mt-4 flex justify-center gap-4 text-xs text-zinc-500">
              <Link to="/auth" className="hover:text-purple-400 underline">
                Register or manage credentials
              </Link>
              <span>•</span>
              <Link to="/" className="hover:text-zinc-300">
                Return to Homepage
              </Link>
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <main className="animate-fade-up-late mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <StaffAnalyticsManager />
      </main>
    </SiteLayout>
  );
}
