import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Edit3, ShieldAlert } from "lucide-react";

import logo from "@/assets/vs-logo.png.asset.json";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { fetchSiteContent } from "@/lib/site";
import { isSuperAdmin, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Rules — Visual Studios" },
      {
        name: "description",
        content: "Community and recording rules every Visual Studios member must follow.",
      },
      { property: "og:title", content: "Rules — Visual Studios" },
      {
        property: "og:description",
        content: "Community and recording rules every Visual Studios member must follow.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  const { role } = useAuth();
  const { data } = useQuery({
    queryKey: ["site", "rules"],
    queryFn: () => fetchSiteContent("rules"),
  });

  return (
    <SiteLayout>
      <main className="animate-fade-up-late mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <article className="glass-panel purple-glow rounded-3xl p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass-highlight px-3.5 py-1 text-xs uppercase tracking-widest text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Visual Studios Code of Conduct
            </div>

            {isSuperAdmin(role) && (
              <Button asChild size="sm" variant="outline" className="rounded-full text-xs">
                <Link to="/panel">
                  <Edit3 className="mr-1.5 h-3.5 w-3.5 text-primary" /> Edit Rules in Control Panel
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
              {data?.title || "Visual Studios Rules & Guidelines"}
            </h1>
          </div>

          <div className="mt-8 space-y-4">
            {(data?.body || "")
              .split("\n")
              .filter((line) => line.trim().length > 0)
              .map((line, idx) => (
                <div
                  key={idx}
                  className="glass-card flex items-start gap-4 rounded-2xl p-4 sm:p-5 transition hover:border-primary/30"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {idx + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground sm:text-base">
                    {line.replace(/^\d+[.)]\s*/, "")}
                  </p>
                </div>
              ))}
          </div>

          <div className="mt-8 rounded-2xl border border-glass-border bg-glass-highlight p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <ShieldAlert className="h-4 w-4 text-amber-400" /> Enforcement Policy
            </div>
            <p className="mt-1">
              Violations are reviewed by the Recording Team, Managers, and Founders. Questions about
              rulings should be directed through our official Discord server.
            </p>
          </div>
        </article>
      </main>
    </SiteLayout>
  );
}
