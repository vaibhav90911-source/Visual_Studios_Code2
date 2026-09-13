import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Edit3, Info, Sparkles, Users } from "lucide-react";

import logo from "@/assets/vs-logo.png.asset.json";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { fetchSiteContent } from "@/lib/site";
import { isSuperAdmin, useAuth } from "@/lib/auth";
import { DISCORD_INVITE } from "@/lib/discord.functions";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Visual Studios" },
      {
        name: "description",
        content: "Who we are: the Visual Studios recording crew, our sessions and our community.",
      },
      { property: "og:title", content: "About — Visual Studios" },
      {
        property: "og:description",
        content: "Who we are: the Visual Studios recording crew, our sessions and our community.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { role } = useAuth();
  const { data } = useQuery({
    queryKey: ["site", "about"],
    queryFn: () => fetchSiteContent("about"),
  });

  return (
    <SiteLayout>
      <main className="animate-fade-up-late mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <article className="glass-panel purple-glow rounded-3xl p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass-highlight px-3.5 py-1 text-xs uppercase tracking-widest text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-primary" /> Collective Overview
            </div>

            {isSuperAdmin(role) && (
              <Button asChild size="sm" variant="outline" className="rounded-full text-xs">
                <Link to="/panel">
                  <Edit3 className="mr-1.5 h-3.5 w-3.5 text-primary" /> Edit About in Control Panel
                </Link>
              </Button>
            )}
          </div>

          <div className="accent-line my-6 h-1 w-24 rounded-full" />

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <img
              src={logo.url}
              alt="Visual Studios Logo"
              referrerPolicy="no-referrer"
              className="h-16 w-auto aspect-[16/9] rounded-2xl border border-zinc-800 bg-black object-contain shadow-xl shadow-black shrink-0"
            />
            <h1 className="font-display text-3xl font-bold uppercase tracking-widest sm:text-4xl text-foreground">
              {data?.title || "About Visual Studios"}
            </h1>
          </div>

          <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
            {(data?.body || "")
              .split("\n\n")
              .filter((para) => para.trim().length > 0)
              .map((para, idx) => (
                <p key={idx} className="whitespace-pre-line text-foreground/90">
                  {para}
                </p>
              ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Award className="h-4 w-4" /> Production Standard
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Uncompromising audio quality, verified review proofs, and meticulous scheduling for
                every creator shoot.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Users className="h-4 w-4" /> Community First
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Connecting talented players, editors, and directors across Discord with open
                recording rosters.
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-glass-border pt-6">
            <span className="text-xs text-muted-foreground">Want to collaborate?</span>
            <Button asChild className="rounded-full shadow-lg shadow-primary/20">
              <a href={DISCORD_INVITE} target="_blank" rel="noreferrer">
                Join our Discord Server
              </a>
            </Button>
          </div>
        </article>
      </main>
    </SiteLayout>
  );
}
