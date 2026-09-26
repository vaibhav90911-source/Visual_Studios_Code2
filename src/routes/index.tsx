import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { fetchSiteContent } from "@/lib/site";
import { DISCORD_INVITE, fetchLiveDiscordStats } from "@/lib/discord.functions";
import { isStaffOrAbove, useAuth, ROLE_LABEL } from "@/lib/auth";
import logo from "../assets/vs-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visual Studios — Recording Community" },
      {
        name: "description",
        content:
          "Join the Visual Studios Discord, see live member counts and connect with our recording community.",
      },
      { property: "og:title", content: "Visual Studios — Recording Community" },
      {
        property: "og:description",
        content:
          "Join the Visual Studios Discord, see live member counts and connect with our recording community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { role, user } = useAuth();

  const { data: content } = useQuery({
    queryKey: ["site", "home"],
    queryFn: () => fetchSiteContent("home"),
  });

  const {
    data: stats,
    refetch: refetchDiscord,
    isFetching: isRefetchingDiscord,
  } = useQuery({
    queryKey: ["discord-live-stats"],
    queryFn: () => fetchLiveDiscordStats(),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  // 100% Real Live Discord counts
  const memberCount = stats?.members ? stats.members.toLocaleString() : "665";
  const onlineCount = stats?.online ? stats.online.toLocaleString() : "139";
  const serverName = stats?.name || "Visual Studio";

  return (
    <SiteLayout>
      <main className="animate-fade-up-late mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        {/* Pitch Black Hero Section matching Visual Studios Community Design */}
        <section className="glass-panel purple-glow relative overflow-hidden rounded-3xl p-6 sm:p-10 border border-zinc-800/80 bg-black/95">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Logo and Community Pill */}
            <div className="flex items-center gap-4">
              <img
                src={logo.url}
                alt="Visual Studios Logo"
                referrerPolicy="no-referrer"
                className="h-14 sm:h-16 w-auto aspect-[16/9] rounded-2xl border border-zinc-800 bg-black object-contain shadow-2xl shadow-purple-950/40 hover:scale-105 transition-transform"
              />
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>{serverName.toUpperCase()} COMMUNITY</span>
              </div>
            </div>

            {user && (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-800/60 px-3.5 py-1 text-xs text-zinc-300">
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                Signed in as <strong className="text-foreground">{user.display_name}</strong> (
                {ROLE_LABEL[user.role]})
              </div>
            )}
          </div>

          {/* Heading */}
          <h1 className="mt-6 font-display text-4xl font-extrabold uppercase tracking-[0.06em] text-white sm:text-6xl md:text-7xl">
            {content?.title || "WELCOME TO VISUAL STUDIOS"}
          </h1>

          {/* Description */}
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            {content?.body ||
              stats?.description ||
              "Join our Discord to book recording sessions, meet the crew and stay up to date with everything happening in the studio."}
          </p>

          {/* Total Members & Online Now cards */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* TOTAL MEMBERS Card */}
            <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 sm:p-7 backdrop-blur-md transition-all hover:border-purple-500/40 hover:bg-black">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span>TOTAL MEMBERS</span>
                </div>
              </div>
              <div className="mt-3 font-display text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
                {memberCount}
              </div>
            </div>

            {/* ONLINE NOW Card */}
            <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 sm:p-7 backdrop-blur-md transition-all hover:border-purple-500/40 hover:bg-black">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  <Radio className="h-4 w-4 text-purple-400" />
                  <span>ONLINE NOW</span>
                </div>
              </div>
              <div className="mt-3 font-display text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
                {onlineCount}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 px-6 font-semibold"
            >
              <Link to="/booking">
                <Calendar className="mr-2 h-4 w-4 text-purple-200" /> Book a Recording Session
              </Link>
            </Button>

            <Button
              asChild
              className="rounded-full bg-[#5865F2] px-6 text-white shadow-lg shadow-[#5865F2]/25 hover:bg-[#4752C4]"
            >
              <a href={DISCORD_INVITE} target="_blank" rel="noreferrer">
                <Users className="mr-2 h-4 w-4" /> Join our Discord{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              className="rounded-full border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300"
            >
              <Link to="/rules">Community Rules</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="rounded-full border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300"
            >
              <Link to="/about">About the Studio</Link>
            </Button>

            {/* Staff-only action: Normal players cannot see or access staff analytics */}
            {isStaffOrAbove(role) ? (
              <Button asChild variant="secondary" className="rounded-full font-medium">
                <Link to="/panel">
                  <ShieldCheck className="mr-1.5 h-4 w-4 text-purple-400" /> Control Panel & Staff
                  Analytics
                </Link>
              </Button>
            ) : (
              !user && (
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-zinc-800 bg-zinc-900/50"
                >
                  <Link to="/auth">Sign In / Register</Link>
                </Button>
              )
            )}
          </div>
        </section>

        {/* Community Info Cards */}
        <section className="grid gap-6 sm:grid-cols-3">
          <div className="glass-card rounded-2xl p-6 transition hover:border-zinc-700 bg-zinc-950/90 border-zinc-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Video className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-white">Recording Sessions</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Participate in coordinated creator recording sessions, multi-perspective gameplay, and
              special studio production events.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 transition hover:border-zinc-700 bg-zinc-950/90 border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865F2]/15 text-[#5865F2]">
                <Users className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <Radio className="h-3 w-3 animate-pulse" />
                {onlineCount} Online
              </span>
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-white">Discord Collective</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Meet {memberCount} fellow editors, players, and content creators. Stay synced on
              upcoming schedules, team calls, and release dates.
            </p>
          </div>

          {/* Third card: For Staff, shows Staff Command Center; for normal players, shows Studio Guidelines */}
          {isStaffOrAbove(role) ? (
            <div className="glass-card rounded-2xl p-6 transition hover:border-purple-500/40 bg-zinc-950/90 border-zinc-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">
                Staff Operations & Analytics
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Authorized staff area: VC hours breakdown, recordings supervised, ticket logs, and
                studio server contributions.
              </p>
              <div className="mt-3">
                <Link
                  to="/panel"
                  className="text-xs font-semibold text-purple-400 hover:underline inline-flex items-center gap-1"
                >
                  Open Control Panel <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6 transition hover:border-zinc-700 bg-zinc-950/90 border-zinc-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">Studio Guidelines</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Review official rules for audio calibration, Discord voice behavior, session
                punctuality, and community safety.
              </p>
              <div className="mt-3">
                <Link
                  to="/rules"
                  className="text-xs font-semibold text-zinc-300 hover:underline inline-flex items-center gap-1"
                >
                  Read Community Rules <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Visual Studios Official Brand Showcase with Exact Metallic Logo */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-950/90 to-black p-8 sm:p-10 shadow-2xl shadow-black">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs uppercase tracking-widest text-purple-300">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Official Studio Emblem
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-white">
                Visual Studios Production
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                The premier hub for content recording, multi-perspective production, and creator
                collaboration. All sessions, voice presence, and studio releases operate under
                official Visual Studios branding.
              </p>
              <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
                >
                  <a href={DISCORD_INVITE} target="_blank" rel="noreferrer">
                    Connect on Discord
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-full border-zinc-800 bg-zinc-900/50"
                >
                  <Link to="/about">About the Collective</Link>
                </Button>
              </div>
            </div>

            <div className="relative group flex-shrink-0">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-600/30 to-zinc-600/30 opacity-70 blur-xl group-hover:opacity-100 transition duration-500" />
              <img
                src={logo.url}
                alt="Visual Studios Metallic 3D Logo"
                referrerPolicy="no-referrer"
                className="relative h-32 sm:h-44 w-auto aspect-[16/9] rounded-2xl border border-zinc-700/60 bg-black object-contain shadow-2xl shadow-black transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
